const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { activeFilter, today, dateValue } = require('../utils/bookingRules');
const { transaction, failure } = require('../utils/transaction');
const { authenticated, requireRoles } = require('../middleware/auth');
const router = express.Router();
const objectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
const versionOK = (v) => Number.isInteger(v) && v >= 0;
const typeView = (t) => ({ id: String(t._id), name: t.name, rate: t.rate, capacity: t.capacity,
  description: t.description, image: t.image, version: t.__v || 0 });
const roomView = (r) => ({ id: String(r._id), number: r.number, roomTypeId: String(r.roomType),
  status: r.status, notes: r.notes, version: r.__v || 0 });

// This is a room catalog, NOT date-based booking availability.
router.get('/catalog', async (req, res) => {
  const types = await RoomType.find().sort({ name: 1 });
  res.json({ types: types.map(typeView) });
});

router.use(authenticated, requireRoles('admin', 'front-desk', 'housekeeping'));
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.get('X-CSRF-Token');
  const expected = req.session.csrfToken;
  if (!sent || !expected || Buffer.byteLength(sent) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(sent), Buffer.from(expected))) {
    return res.status(403).json({ error: 'Refresh the form and try again.' });
  }
  if (!req.is('application/json')) return res.status(415).json({ error: 'Send the request as JSON.' });
  next();
});
const writes = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many changes. Wait a minute and try again.' } });

router.get('/', async (req, res) => {
  const [types, rooms] = await Promise.all([RoomType.find().sort({ name: 1 }), Room.find().sort({ number: 1 })]);
  res.json({ types: types.map(typeView), rooms: rooms.map(roomView) });
});

// A date-based staff view, distinct from the catalog and housekeeping status.
router.get('/availability', requireRoles('admin', 'front-desk'), async (req, res) => {
  const { checkIn, checkOut } = req.query;
  const start = dateValue(checkIn), end = dateValue(checkOut), nights = (end - start) / 86400000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 90 || checkIn < today() || start > dateValue(today()) + 365 * 86400000) {
    throw failure(400, 'Choose arrival today or later (within one year) and a stay of 1 to 90 nights.');
  }
  const blocked = await Booking.distinct('room', { $or: [
    { ...activeFilter(), checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } },
    { status: 'checked-in' },
  ] });
  const ids = new Set(blocked.map(String));
  const [types, rooms] = await Promise.all([RoomType.find().sort({ name: 1 }), Room.find().sort({ number: 1 })]);
  const rows = rooms.map((r) => {
    const reason = r.status === 'occupied' ? 'Occupied' : r.status === 'maintenance' ? 'Maintenance' : ids.has(String(r._id)) ? 'Reserved for these dates' : '';
    return { ...roomView(r), available: !reason, ready: !reason && r.status === 'available',
      availability: reason || (r.status === 'dirty' ? 'Available after cleaning' : 'Available') };
  });
  res.json({ types: types.map(typeView), rooms: rows, checkIn, checkOut, checkedAt: new Date() });
});

function typeInput(b) {
  if (!b || typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 100) return null;
  if (typeof b.rate !== 'number' || !Number.isFinite(b.rate) || b.rate <= 0 || b.rate > 10000000 || Math.abs(b.rate * 100 - Math.round(b.rate * 100)) > 0.000001) return null;
  if (!Number.isInteger(b.capacity) || b.capacity < 1 || b.capacity > 50) return null;
  if (typeof b.description !== 'string' || b.description.length > 1000) return null;
  if (typeof b.image !== 'string' || b.image.length > 300 || !/^\/(?!\/)[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp|avif)$/.test(b.image)) return null;
  return { name: b.name.trim(), rate: b.rate, capacity: b.capacity, description: b.description.trim(), image: b.image };
}
function roomInput(b) {
  if (!b || typeof b.number !== 'string' || b.number.trim().length > 20 || !/^[A-Z0-9][A-Z0-9 -]*$/i.test(b.number.trim())) return null;
  if (!objectId(b.roomTypeId) || typeof b.notes !== 'string' || b.notes.length > 500) return null;
  return { number: b.number.trim().toUpperCase(), roomType: b.roomTypeId, notes: b.notes.trim() };
}

router.post('/types', writes, requireRoles('admin'), async (req, res) => {
  const input = typeInput(req.body);
  if (!input) return res.status(400).json({ error: 'Check the room type name, price, capacity, description and image path.' });
  const type = await RoomType.create(input);
  res.status(201).json({ type: typeView(type) });
});

router.patch('/types/:id', writes, requireRoles('admin'), async (req, res) => {
  const input = typeInput(req.body);
  if (!objectId(req.params.id) || !input || !versionOK(req.body.version)) return res.status(400).json({ error: 'Invalid room type details or version.' });
  // Type identity/capacity changes need reservation-aware checks in the next phase.
  const original = await RoomType.findById(req.params.id);
  if (!original) return res.status(404).json({ error: 'Room type not found.' });
  if (input.name !== original.name || input.capacity !== original.capacity) return res.status(409).json({ error: 'Changing existing type names or capacities is unavailable until reservation checks are connected.' });
  const type = await RoomType.findOneAndUpdate({ _id: original._id, __v: req.body.version },
    { $set: input, $inc: { __v: 1 } }, { new: true, runValidators: true });
  if (!type) return res.status(409).json({ error: 'This room type changed. Refresh and try again.' });
  res.json({ type: typeView(type) });
});

router.post('/', writes, requireRoles('admin'), async (req, res) => {
  const input = roomInput(req.body);
  if (!input) return res.status(400).json({ error: 'Check the room number, type and notes.' });
  if (!(await RoomType.exists({ _id: input.roomType }))) return res.status(400).json({ error: 'Choose an existing room type.' });
  const room = await Room.create({ ...input, status: 'dirty' });
  res.status(201).json({ room: roomView(room) });
});

router.patch('/:id', writes, requireRoles('admin'), async (req, res) => {
  const input = roomInput(req.body);
  if (!objectId(req.params.id) || !input || !versionOK(req.body.version)) return res.status(400).json({ error: 'Invalid room details or version.' });
  const room = await transaction(async (session) => {
    // This write serializes room edits with online bookings, walk-ins and check-in.
    const original = await Room.findOneAndUpdate({ _id: req.params.id, __v: req.body.version, status: { $ne: 'occupied' } },
      { $inc: { __v: 1 } }, { session, returnDocument: 'before' });
    if (!original) throw failure(409, 'Room unavailable, occupied, or changed. Refresh and try again.');
    if (!(await RoomType.exists({ _id: input.roomType }).session(session))) throw failure(400, 'Choose an existing room type.');
    if (String(original.roomType) !== input.roomType || original.number !== input.number) {
      const reserved = await Booking.exists({ room: original._id, ...activeFilter() }).session(session);
      if (reserved) throw failure(409, 'This room has an active booking or payment hold. Resolve it before changing its number or type.');
    }
    return Room.findOneAndUpdate({ _id: original._id }, { $set: input }, { session, returnDocument: 'after', runValidators: true });
  });
  res.json({ room: roomView(room) });
});

router.patch('/:id/status', writes, requireRoles('admin', 'housekeeping'), async (req, res) => {
  const b = req.body || {};
  if (!objectId(req.params.id) || !versionOK(b.version) || !['available', 'dirty', 'maintenance'].includes(b.status)) return res.status(400).json({ error: 'Choose a valid housekeeping status and version.' });
  if (b.status === 'maintenance') {
    const room = await transaction(async (session) => {
      const locked = await Room.findOneAndUpdate({ _id: req.params.id, __v: b.version, status: { $ne: 'occupied' } },
        { $set: { status: 'maintenance' }, $inc: { __v: 1 } }, { session, new: true, runValidators: true });
      if (!locked) throw failure(409, 'Room unavailable, occupied, or changed. Refresh and try again.');
      const reserved = await Booking.exists({ room: locked._id, ...activeFilter(), checkOut: { $gt: today() } }).session(session);
      if (reserved) throw failure(409, 'This room has an active reservation. Resolve the reservation before maintenance.');
      return locked;
    });
    return res.json({ room: roomView(room) });
  }
  const room = await Room.findOneAndUpdate({ _id: req.params.id, __v: b.version, status: { $ne: 'occupied' } },
    { $set: { status: b.status }, $inc: { __v: 1 } }, { new: true, runValidators: true });
  if (!room) return res.status(409).json({ error: 'Room unavailable, occupied, or changed. Refresh and try again.' });
  res.json({ room: roomView(room) });
});

// Remove only unused rooms. Booking history keeps its original room reference.
router.delete('/:id', writes, requireRoles('admin'), async (req, res) => {
  if (!objectId(req.params.id) || !versionOK(req.body?.version) || req.body?.confirm !== true) throw failure(400, 'Confirm room removal and refresh its version.');
  await transaction(async (session) => {
    const room = await Room.findOneAndUpdate({ _id: req.params.id, __v: req.body.version, status: { $ne: 'occupied' } },
      { $inc: { __v: 1 } }, { session, returnDocument: 'after' });
    if (!room) throw failure(409, 'Room unavailable, occupied, or changed. Refresh and try again.');
    if (await Booking.exists({ room: room._id }).session(session)) throw failure(409, 'This room has booking history and cannot be removed. Keep it for reservation records.');
    await Room.deleteOne({ _id: room._id }, { session });
  });
  res.json({ removedId: req.params.id });
});
router.use((error, req, res, next) => {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === 11000) return res.status(409).json({ error: 'That room number or room type name already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: 'Check the room details.' });
  next(error);
});

module.exports = router;
