const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const { authenticated, requireRoles } = require('../middleware/auth');
const { stayInput, activeFilter, fingerprint, quote, today } = require('../utils/bookingRules');
const { transaction, failure } = require('../utils/transaction');
const router = express.Router();
const idOK = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const view = (b) => ({ id: String(b._id), guestId: String(b.guest), roomTypeId: String(b.roomType),
  type: b.typeName, checkIn: b.checkIn, checkOut: b.checkOut, adults: b.adults, children: b.children,
  requests: b.requests, status: b.status === 'pending-payment' && b.holdUntil <= new Date() ? 'expired' : b.status,
  holdUntil: b.holdUntil, rateCents: b.rateCents, totalCents: b.totalCents, depositCents: b.depositCents,
  paidCents: b.paidCents, currency: b.currency, version: b.__v || 0 });

// Always return a fresh count; this is not a guarantee until the hold is saved.
router.get('/availability', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const input = stayInput({ ...req.query, adults: Number(req.query.adults), children: Number(req.query.children) });
  if (!input) return res.status(400).json({ error: 'Select a valid room type, dates and guest count (maximum 90 nights).' });
  const type = await RoomType.findById(input.roomTypeId);
  if (!type || input.adults + input.children > type.capacity) return res.status(400).json({ error: 'The selected room type cannot accommodate these guests.' });
  const blocked = await Booking.distinct('room', { ...activeFilter(), checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } });
  const available = await Room.countDocuments({ roomType: type._id, status: { $in: ['available', 'dirty'] }, _id: { $nin: blocked } });
  res.json({ available, ...quote(type, input.nights), nights: input.nights, type: type.name });
});

router.use(authenticated, requireRoles('guest', 'admin', 'front-desk'));
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'GET') return next();
  const token = req.get('X-CSRF-Token'), expected = req.session.csrfToken;
  if (!token || !expected || Buffer.byteLength(token) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return res.status(403).json({ error: 'Refresh and try again.' });
  if (!req.is('application/json')) return res.status(415).json({ error: 'Send JSON.' });
  next();
});
const writes = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many requests. Wait a minute and try again.' } });

router.get('/', async (req, res) => {
  const filter = req.account.role === 'guest' ? { guest: req.account._id } : {};
  const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
  const rows = await Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(51);
  res.json({ bookings: rows.slice(0, 50).map(view), page, hasMore: rows.length > 50 });
});

// No card numbers, CVVs or client-reported payments are accepted here.
router.post('/', writes, requireRoles('guest'), async (req, res) => {
  const b = req.body || {}, input = stayInput(b);
  if (!input || typeof b.requestId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(b.requestId) || !Number.isSafeInteger(b.expectedTotalCents) || b.expectedTotalCents <= 0) return res.status(400).json({ error: 'Invalid booking details. Review the latest quote.' });
  const digest = fingerprint(input, b.expectedTotalCents);
  const identity = { guest: req.account._id, requestId: b.requestId };
  function replay(existing) {
    if (existing.fingerprint !== digest) throw failure(409, 'This request ID was already used for different booking details.');
    return existing;
  }
  let booking;
  try {
    booking = await transaction(async (session) => {
      const existing = await Booking.findOne(identity).session(session);
      if (existing) return replay(existing);
      const type = await RoomType.findById(input.roomTypeId).session(session);
      if (!type || input.adults + input.children > type.capacity) throw failure(400, 'Choose a room type with enough capacity.');
      const price = quote(type, input.nights);
      if (price.totalCents !== b.expectedTotalCents) throw failure(409, 'The price changed. Review a new quote before continuing.');
      const now = new Date();
      const blocked = await Booking.distinct('room', { ...activeFilter(now), checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } }).session(session);
      // Writing the room serializes concurrent booking and maintenance transactions.
      const room = await Room.findOneAndUpdate({ roomType: type._id, status: { $in: ['available', 'dirty'] }, _id: { $nin: blocked } },
        { $inc: { __v: 1 } }, { session, new: true, sort: { number: 1 } });
      if (!room) throw failure(409, 'No room is available for the whole stay. Choose different dates.');
      const [saved] = await Booking.create([{ ...identity, room: room._id, roomType: type._id, typeName: type.name, roomNumber: room.number,
        checkIn: input.checkIn, checkOut: input.checkOut, adults: input.adults, children: input.children, requests: input.requests,
        ...price, paidCents: 0, fingerprint: digest, status: 'pending-payment', holdUntil: new Date(now.getTime() + 30 * 60000) }], { session });
      return saved;
    });
  } catch (error) {
    // A retry after an uncertain network result must not create another booking.
    if (error.code !== 11000) throw error;
    const existing = await Booking.findOne(identity);
    if (!existing) throw error;
    booking = replay(existing);
  }
  res.status(201).json({ booking: view(booking) });
});

router.post('/:id/cancel', writes, async (req, res) => {
  const version = req.body?.version;
  if (!idOK(req.params.id) || !Number.isInteger(version) || version < 0) return res.status(400).json({ error: 'Invalid booking or version.' });
  const booking = await transaction(async (session) => {
    const filter = { _id: req.params.id, ...(req.account.role === 'guest' ? { guest: req.account._id } : {}) };
    const old = await Booking.findOne(filter).session(session);
    if (!old) throw failure(404, 'Booking not found.');
    if (old.status === 'cancelled') return old;
    if (old.__v !== version) throw failure(409, 'Booking changed. Refresh before cancelling.');
    if (!['pending-payment', 'confirmed'].includes(old.status) || old.paidCents > 0) throw failure(409, 'Contact the front desk to review this booking and any payment.');
    if (req.account.role === 'guest' && old.status === 'confirmed' && old.checkIn <= today()) throw failure(409, 'Contact the front desk for arrivals due today.');
    await Room.updateOne({ _id: old.room }, { $inc: { __v: 1 } }, { session });
    old.status = 'cancelled'; old.cancelledAt = new Date(); old.__v += 1;
    await old.save({ session });
    return old;
  });
  res.json({ booking: view(booking) });
});

router.use((error, req, res, next) => {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: 'Check the booking details.' });
  next(error);
});
module.exports = router;
