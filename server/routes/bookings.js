const bookingMail = require('../utils/bookingMail');
const express = require('express');
const { timingSafeEqual, randomUUID } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const { authenticated, requireRoles } = require('../middleware/auth');
const { stayInput, activeFilter, fingerprint, quote, today } = require('../utils/bookingRules');
const { transaction, failure } = require('../utils/transaction');
const demoPaymentLabel = require('../utils/demoPayment');
const router = express.Router();
const methods = ['GCash', 'Maya', 'Card', 'Bank Transfer'];
const idOK = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const view = (b) => ({ id: String(b._id), guestId: b.guest ? String(b.guest) : null, roomTypeId: String(b.roomType),
  refundedCents: b.refundedCents || 0,
  simulatedRefund: b.simulatedRefund?.reference ? { reference: b.simulatedRefund.reference, method: b.simulatedRefund.method,
    originalReference: b.simulatedRefund.originalReference, amountCents: b.simulatedRefund.amountCents, recordedAt: b.simulatedRefund.recordedAt } : null,
  type: b.typeName, checkIn: b.checkIn, checkOut: b.checkOut, adults: b.adults, children: b.children,
  requests: b.requests, status: b.status === 'pending-payment' && b.holdUntil <= new Date() ? 'expired' : b.status,
  checkedInAt: b.checkedInAt, checkedOutAt: b.checkedOutAt,
  simulatedSettlement: b.simulatedSettlement?.reference ? { reference: b.simulatedSettlement.reference, method: b.simulatedSettlement.method, detailsLabel: b.simulatedSettlement.detailsLabel,
    amountCents: b.simulatedSettlement.amountCents, recordedAt: b.simulatedSettlement.recordedAt } : null,
  holdUntil: b.holdUntil, rateCents: b.rateCents, totalCents: b.totalCents, depositCents: b.depositCents,
  paidCents: b.paidCents, currency: b.currency, version: b.__v || 0, archived: Boolean(b.archivedAt),
  simulatedPayment: b.simulatedPayment?.reference ? { reference: b.simulatedPayment.reference, method: b.simulatedPayment.method, detailsLabel: b.simulatedPayment.detailsLabel,
    amountCents: b.simulatedPayment.amountCents, recordedAt: b.simulatedPayment.recordedAt } : null });

router.get('/options', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ demoPaymentsEnabled: process.env.DEMO_PAYMENTS === 'true' });
});

// Always return a fresh count; this is not a guarantee until the hold is saved.
router.get('/availability', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const input = stayInput({ ...req.query, adults: Number(req.query.adults), children: Number(req.query.children) });
  if (!input) return res.status(400).json({ error: 'Select a valid room type, dates and guest count (maximum 90 nights).' });
  const type = await RoomType.findOne({ _id: input.roomTypeId, archivedAt: null });
  if (!type || input.adults + input.children > type.capacity) return res.status(400).json({ error: 'The selected room type cannot accommodate these guests.' });
  const blocked = await Booking.distinct('room', { ...activeFilter(), checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } });
  const available = await Room.countDocuments({ roomType: type._id, status: { $in: ['available', 'dirty'] }, archivedAt: null, _id: { $nin: blocked } });
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


router.use('/walk-in', requireRoles('admin', 'front-desk'), require('./walkIn'));

// Staff receive selected contact fields only; guest responses remain unchanged.
router.get('/staff-list', requireRoles('admin', 'front-desk'), async (req, res) => {
  const statuses = ['pending-payment', 'expired', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];
  const status = req.query.status || '';
  if (typeof status !== 'string' || (status && !statuses.includes(status))) return res.status(400).json({ error: 'Invalid status filter.' });
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return res.status(400).json({ error: 'Invalid page.' });
  const includeArchived = req.account.role === 'admin' && req.query.includeArchived === 'true';
  const now = new Date();
  const filter = status === 'expired' ? { status: 'pending-payment', holdUntil: { $lte: now } }
    : status === 'pending-payment' ? { status, holdUntil: { $gt: now } } : status ? { status } : {};
  if (!includeArchived) filter.archivedAt = null;
  const rows = await Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(51);
  const shown = rows.slice(0, 50);
  const User = require('../models/User');
  const users = await User.find({ _id: { $in: shown.map((b) => b.guest) } }).select('name email contactEmail phone').lean();
  const contacts = new Map(users.map((u) => [String(u._id), { name: u.name, email: u.contactEmail || u.email, phone: u.phone || '' }]));
  res.json({ bookings: shown.map((b) => ({ ...view(b), roomNumber: b.roomNumber,
    createdAt: b.createdAt, guest: b.source === 'walk-in' ? b.walkInGuest : contacts.get(String(b.guest)) || null })), page, hasMore: rows.length > 50 });
});

router.get('/', async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const filter = { ...(req.account.role === 'guest' ? { guest: req.account._id } : {}),
    ...(!includeArchived ? { archivedAt: null } : {}) };
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
      const type = await RoomType.findOne({ _id: input.roomTypeId, archivedAt: null }).session(session);
      if (!type || input.adults + input.children > type.capacity) throw failure(400, 'Choose a room type with enough capacity.');
      const price = quote(type, input.nights);
      if (price.totalCents !== b.expectedTotalCents) throw failure(409, 'The price changed. Review a new quote before continuing.');
      const now = new Date();
      const blocked = await Booking.distinct('room', { ...activeFilter(now), checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } }).session(session);
      // Writing the room serializes concurrent booking and maintenance transactions.
      const room = await Room.findOneAndUpdate({ roomType: type._id, status: { $in: ['available', 'dirty'] }, archivedAt: null, _id: { $nin: blocked } },
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

router.patch('/:id', writes, async (req, res) => {
  const b = req.body || {}, input = stayInput(b);
  if (!idOK(req.params.id) || !input || !Number.isInteger(b.version) || b.version < 0 ||
    !Number.isSafeInteger(b.expectedTotalCents) || b.expectedTotalCents <= 0) {
    throw failure(400, 'Enter valid booking details and review the latest price.');
  }
  const booking = await transaction(async (session) => {
    const filter = { _id: req.params.id, ...(req.account.role === 'guest' ? { guest: req.account._id } : {}) };
    const old = await Booking.findOne(filter).session(session);
    if (!old) throw failure(404, 'Booking not found.');
    if (old.__v !== b.version) throw failure(409, 'Booking changed. Refresh before editing.');
    if (old.status !== 'pending-payment' || old.paidCents !== 0 || old.holdUntil <= new Date() || old.archivedAt) {
      throw failure(409, 'Only an active, unpaid booking hold can be edited.');
    }
    const type = await RoomType.findOne({ _id: input.roomTypeId, archivedAt: null }).session(session);
    if (!type || input.adults + input.children > type.capacity) throw failure(400, 'Choose an active room type with enough capacity.');
    const price = quote(type, input.nights);
    if (price.totalCents !== b.expectedTotalCents) throw failure(409, 'The price changed. Review a new quote before saving.');
    const now = new Date();
    const blocked = await Booking.distinct('room', {
      ...activeFilter(now), _id: { $ne: old._id },
      checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn },
    }).session(session);
    const room = await Room.findOneAndUpdate({
      roomType: type._id, status: { $in: ['available', 'dirty'] }, archivedAt: null, _id: { $nin: blocked },
    }, { $inc: { __v: 1 } }, { session, new: true, sort: { number: 1 } });
    if (!room) throw failure(409, 'No room is available for the revised dates. Choose another stay.');
    old.room = room._id;
    old.roomType = type._id;
    old.typeName = type.name;
    old.roomNumber = room.number;
    old.checkIn = input.checkIn;
    old.checkOut = input.checkOut;
    old.adults = input.adults;
    old.children = input.children;
    old.requests = input.requests;
    old.rateCents = price.rateCents;
    old.totalCents = price.totalCents;
    old.depositCents = price.depositCents;
    old.currency = price.currency;
    old.fingerprint = fingerprint(input, price.totalCents);
    old.__v += 1;
    await old.save({ session });
    return old;
  });
  res.json({ booking: view(booking) });
});

router.delete('/:id', writes, requireRoles('guest', 'admin', 'front-desk'), async (req, res) => {
  if (!idOK(req.params.id) || !Number.isInteger(req.body?.version) || req.body.version < 0 || req.body.confirm !== true) {
    throw failure(400, 'Confirm archival and refresh the booking version.');
  }
  const now = new Date();
  const booking = await Booking.findOneAndUpdate({
    _id: req.params.id, __v: req.body.version, archivedAt: null,
    ...(req.account.role === 'guest' ? { guest: req.account._id } : {}),
    $or: [{ status: 'cancelled' }, { status: 'pending-payment', holdUntil: { $lte: now } }],
  }, { $set: { archivedAt: now, archivedBy: req.account._id }, $inc: { __v: 1 } }, { returnDocument: 'after' });
  if (!booking) throw failure(409, 'Only cancelled or expired bookings can be archived. Refresh and try again.');
  res.json({ booking: view(booking) });
});

router.post('/:id/restore', writes, requireRoles('guest', 'admin'), async (req, res) => {
  if (!idOK(req.params.id) || !Number.isInteger(req.body?.version) || req.body.version < 0) {
    throw failure(400, 'Invalid booking or version.');
  }
  const booking = await Booking.findOneAndUpdate({ _id: req.params.id, __v: req.body.version, archivedAt: { $ne: null },
    ...(req.account.role === 'guest' ? { guest: req.account._id } : {}) },
    { $unset: { archivedAt: 1, archivedBy: 1 }, $inc: { __v: 1 } }, { returnDocument: 'after' });
  if (!booking) throw failure(409, 'Booking changed or is already active. Refresh and try again.');
  res.json({ booking: view(booking) });
});

// Classroom demonstration only. Never accepts card details or a client amount.
router.post('/:id/simulate-payment', writes, requireRoles('guest'), async (req, res) => {
  if (process.env.DEMO_PAYMENTS !== 'true') return res.status(403).json({ error: 'Payments are currently unavailable.' });
  if (!idOK(req.params.id)) return res.status(400).json({ error: 'Invalid booking.' });
  const booking = await transaction(async (session) => {
    const old = await Booking.findOne({ _id: req.params.id, guest: req.account._id }).session(session);
    if (!old) throw failure(404, 'Booking not found.');
    if (old.simulatedPayment?.reference && ['confirmed', 'checked-in', 'checked-out'].includes(old.status)) {
      if (old.simulatedPayment.method && old.simulatedPayment.method !== req.body?.method) throw failure(409, 'Payment already recorded with another method. Refresh to see its receipt.');
      return old;
    }
    if (!methods.includes(req.body?.method)) throw failure(400, 'Choose GCash, Maya, Card or Bank Transfer.');
    const detailsLabel = demoPaymentLabel(req.body.method);
    if (old.status !== 'pending-payment' || old.holdUntil <= new Date()) throw failure(409, 'This hold expired or is no longer payable. Search again.');
    const room = await Room.findOneAndUpdate({ _id: old.room, status: { $in: ['available', 'dirty'] }, archivedAt: null },
      { $inc: { __v: 1 } }, { session, returnDocument: 'after' });
    if (!room) throw failure(409, 'This room is unavailable. Contact the front desk.');
    // An expired hold may have been replaced while this operation waited.
    const overlap = await Booking.exists({ _id: { $ne: old._id }, room: old.room, ...activeFilter(),
      checkIn: { $lt: old.checkOut }, checkOut: { $gt: old.checkIn } }).session(session);
    if (overlap || old.holdUntil <= new Date()) throw failure(409, 'This hold is no longer available. Search again.');
    old.simulatedPayment = { detailsLabel, method: req.body.method, reference: 'PAY-' + randomUUID(), amountCents: old.depositCents, recordedAt: new Date() };
    old.paidCents = old.depositCents;
    old.status = 'confirmed'; old.__v += 1;
    await old.save({ session });
    await bookingMail(old, 'confirmation', session);
    return old;
  });
  res.json({ booking: view(booking) });
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
    if (!['pending-payment', 'confirmed'].includes(old.status)) throw failure(409, 'Only reservations before check-in can be cancelled.');
    const refund = old.paidCents - (old.refundedCents || 0);
    if (refund < 0) throw failure(409, 'Payment records need review before cancellation.');
    if (refund > 0) {
      if (process.env.DEMO_PAYMENTS !== 'true' || req.body.confirmRefund !== true) throw failure(409, 'Confirm the refund before cancelling this paid reservation.');
      if (!old.simulatedPayment?.reference || old.simulatedSettlement?.reference || old.simulatedPayment.amountCents !== old.paidCents || old.simulatedRefund?.reference) throw failure(409, 'Payment records need review before cancellation.');
    }
    if (req.account.role === 'guest' && old.status === 'confirmed' && old.checkIn <= today()) throw failure(409, 'Contact the front desk for arrivals due today.');
    await Room.updateOne({ _id: old.room }, { $inc: { __v: 1 } }, { session });
    // Refund and cancellation commit together. The original payment stays in history.
    if (refund > 0) {
      old.simulatedRefund = { reference: 'REF-' + randomUUID(), method: old.simulatedPayment.method || 'Original payment method',
        originalReference: old.simulatedPayment.reference, amountCents: refund, recordedAt: new Date() };
      old.refundedCents = old.paidCents;
    }
    old.status = 'cancelled'; old.cancelledAt = new Date(); old.__v += 1;
    await old.save({ session });
    await bookingMail(old, 'cancellation', session);
    return old;
  });
  res.json({ booking: view(booking) });
});


// Room and booking transitions commit together; retries cannot charge twice.
router.post('/:id/check-in', writes, requireRoles('admin', 'front-desk'), async (req, res) => {
  if (!idOK(req.params.id) || !Number.isInteger(req.body?.version) || req.body.version < 0) return res.status(400).json({ error: 'Invalid booking or version.' });
  const booking = await transaction(async (session) => {
    const b = await Booking.findOne({ _id: req.params.id }).session(session);
    if (!b) throw failure(404, 'Booking not found.');
    if (b.status === 'checked-in') return b;
    if (b.__v !== req.body.version) throw failure(409, 'Booking changed. Refresh first.');
    if (b.status !== 'confirmed') throw failure(409, 'Only confirmed reservations can check in.');
    if (today() < b.checkIn || today() >= b.checkOut) throw failure(409, 'Check-in is allowed from arrival date until the day before departure.');
    if (b.paidCents < b.depositCents) throw failure(409, 'The required deposit has not been recorded.');
    const room = await Room.findOneAndUpdate({ _id: b.room, status: 'available', archivedAt: null },
      { $set: { status: 'occupied' }, $inc: { __v: 1 } }, { session, returnDocument: 'after' });
    if (!room) throw failure(409, 'Assigned room must be clean and available. Refresh Housekeeping.');
    const occupied = await Booking.exists({ _id: { $ne: b._id }, room: b.room, status: 'checked-in' }).session(session);
    if (occupied) throw failure(409, 'Another guest is still checked into this room.');
    b.status = 'checked-in'; b.checkedInAt = new Date(); b.checkedInBy = req.account._id; b.__v += 1;
    await b.save({ session }); return b;
  });
  res.json({ booking: view(booking) });
});

router.post('/:id/check-out', writes, requireRoles('admin', 'front-desk'), async (req, res) => {
  if (!idOK(req.params.id) || !Number.isInteger(req.body?.version) || req.body.version < 0) return res.status(400).json({ error: 'Invalid booking or version.' });
  const booking = await transaction(async (session) => {
    const b = await Booking.findOne({ _id: req.params.id }).session(session);
    if (!b) throw failure(404, 'Booking not found.');
    if (b.status === 'checked-out') return b;
    if (b.__v !== req.body.version) throw failure(409, 'Booking changed. Refresh first.');
    if (b.status !== 'checked-in') throw failure(409, 'Only checked-in guests can check out.');
    const balance = Math.max(0, b.totalCents - b.paidCents);
    if (balance && !methods.includes(req.body?.method)) throw failure(400, 'Choose GCash, Maya, Card or Bank Transfer.');
    if (balance && (process.env.DEMO_PAYMENTS !== 'true' || req.body.simulateBalance !== true)) throw failure(409, 'Confirm balance payment before checking out.');
    const detailsLabel = balance ? demoPaymentLabel(req.body.method) : undefined;
    const room = await Room.findOneAndUpdate({ _id: b.room, status: 'occupied', archivedAt: null },
      { $set: { status: 'dirty' }, $inc: { __v: 1 } }, { session, returnDocument: 'after' });
    if (!room) throw failure(409, 'Room status changed. Refresh and check its occupancy.');
    const other = await Booking.exists({ _id: { $ne: b._id }, room: b.room, status: 'checked-in' }).session(session);
    if (other) throw failure(409, 'Conflicting occupancy needs review before check-out.');
    // Only the server calculates the outstanding amount. No real payment is taken.
    if (balance) {
      b.simulatedSettlement = { detailsLabel, method: req.body.method, reference: 'PAY-' + randomUUID(), amountCents: balance, recordedAt: new Date() };
      b.paidCents = b.totalCents;
    }
    b.status = 'checked-out'; b.checkedOutAt = new Date(); b.checkedOutBy = req.account._id; b.__v += 1;
    await b.save({ session });
    await bookingMail(b, 'checkout', session); return b;
  });
  res.json({ booking: view(booking) });
});

router.use((error, req, res, next) => {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: 'Check the booking details.' });
  next(error);
});
module.exports = router;
