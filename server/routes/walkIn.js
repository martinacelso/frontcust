const bookingMail = require('../utils/bookingMail');
const express = require('express');
const { randomUUID, createHash } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const { today, stayInput, activeFilter, quote } = require('../utils/bookingRules');
const { transaction, failure } = require('../utils/transaction');
const paymentDetailsLabel = require('../utils/paymentDetails');
const router = express.Router();
// Mounted behind the booking router's staff authorization, JSON and CSRF checks.
const inputFor = (b) => stayInput({ ...b, checkIn: today(), adults: Number(b.adults), children: Number(b.children) });
const blockedFilter = (input) => ({ $or: [
  { ...activeFilter(), checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } },
  { status: 'checked-in' },
] });
router.get('/rooms', async (req, res) => {
  const input = inputFor(req.query);
  if (!input) throw failure(400, 'Choose departure date, room type and guest counts.');
  const type = await RoomType.findById(input.roomTypeId);
  if (!type || input.adults + input.children > type.capacity) throw failure(400, 'Room capacity is too small.');
  const blocked = await Booking.distinct('room', blockedFilter(input));
  const rooms = await Room.find({ roomType: type._id, status: 'available', _id: { $nin: blocked } }).sort({ number: 1 });
  res.json({ checkIn: input.checkIn, ...quote(type, input.nights), rooms: rooms.map((r) => ({ id: String(r._id), number: r.number })) });
});
router.post('/', rateLimit({ windowMs: 60000, limit: 20, message: { error: 'Wait a minute before trying again.' } }), async (req, res) => {
  if (process.env.DEMO_PAYMENTS !== 'true') throw failure(403, 'Payments are currently unavailable.');
  const b = req.body || {}, input = inputFor(b), g = b.guest || {};
  if (!input || b.checkIn !== input.checkIn || !/^[a-f\d]{24}$/i.test(b.roomId || '') ||
    typeof b.requestId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(b.requestId) ||
    !Number.isSafeInteger(b.expectedTotalCents) || b.expectedTotalCents <= 0 || b.confirmPayment !== true ||
    typeof g.name !== 'string' || g.name.trim().length < 2 || g.name.trim().length > 100 ||
    typeof g.phone !== 'string' || !/^09\d{9}$/.test(g.phone) || typeof g.email !== 'string' ||
    g.email.length > 254 || (g.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email.trim()))) throw failure(400, 'Review guest details, dates and payment confirmation.');
  const detailsLabel = paymentDetailsLabel(b.method, b.paymentDetails);
  const guest = { name: g.name.trim(), phone: g.phone, email: g.email.trim().toLowerCase() };
  const digest = createHash('sha256').update(JSON.stringify({ input, guest, room: b.roomId, total: b.expectedTotalCents, method: b.method, detailsLabel })).digest('hex');
  const identity = { source: 'walk-in', requestId: b.requestId, createdBy: req.account._id };
  const replay = (old) => { if (old.fingerprint !== digest) throw failure(409, 'Request already used. Reopen the form for a different stay.'); return old; };
  let booking;
  try {
    booking = await transaction(async (session) => {
      const old = await Booking.findOne(identity).session(session);
      if (old) return replay(old);
      const type = await RoomType.findById(input.roomTypeId).session(session);
      if (!type || input.adults + input.children > type.capacity) throw failure(400, 'Room capacity is too small.');
      const price = quote(type, input.nights);
      if (price.totalCents !== b.expectedTotalCents) throw failure(409, 'Price changed. Search rooms again.');
      const blocked = await Booking.distinct('room', blockedFilter(input)).session(session);
      // The same room write also serializes online bookings and housekeeping changes.
      const room = await Room.findOneAndUpdate({ _id: { $eq: b.roomId, $nin: blocked }, roomType: type._id, status: 'available' },
        { $set: { status: 'occupied' }, $inc: { __v: 1 } }, { session, returnDocument: 'after' });
      if (!room) throw failure(409, 'Room is no longer clean and available for this stay. Search again.');
      const now = new Date();
      const [saved] = await Booking.create([{ ...identity, walkInGuest: guest, fingerprint: digest,
        room: room._id, roomType: type._id, typeName: type.name, roomNumber: room.number,
        checkIn: input.checkIn, checkOut: input.checkOut, adults: input.adults, children: input.children, requests: input.requests,
        ...price, paidCents: price.depositCents, status: 'checked-in', checkedInAt: now, checkedInBy: req.account._id, holdUntil: now,
        simulatedPayment: { reference: 'PAY-' + randomUUID(), method: b.method, detailsLabel, amountCents: price.depositCents, recordedAt: now },
      }], { session });
      await bookingMail(saved, 'confirmation', session);
      return saved;
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const old = await Booking.findOne(identity);
    if (!old) throw error;
    booking = replay(old);
  }
  res.status(201).json({ id: String(booking._id), roomNumber: booking.roomNumber, status: booking.status,
    reference: booking.simulatedPayment.reference, paidCents: booking.paidCents, totalCents: booking.totalCents });
});
module.exports = router;
