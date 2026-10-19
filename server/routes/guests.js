const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const Booking = require('../models/Booking');
const { authenticated, requireRoles } = require('../middleware/auth');
const router = express.Router();
const fields = 'name email contactEmail phone active updatedAt';
const view = (u) => ({ id: String(u._id), name: u.name, email: u.email, contactEmail: u.contactEmail || u.email,
  phone: u.phone || '', active: u.active, updatedAt: u.updatedAt });
const idOK = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const pageNumber = (value) => { const page = Number(value || 1); return Number.isInteger(page) && page >= 1 && page <= 10000 ? page : null; };
router.use(authenticated, requireRoles('admin', 'front-desk'));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/', async (req, res) => {
  const page = pageNumber(req.query.page), q = req.query.q || '';
  if (!page || typeof q !== 'string' || q.length > 100) return res.status(400).json({ error: 'Invalid search or page.' });
  const filter = { role: 'guest' };
  if (q.trim()) {
    const pattern = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['name', 'email', 'contactEmail', 'phone'].map((key) => ({ [key]: { $regex: pattern, $options: 'i' } }));
  }
  const users = await User.find(filter).select(fields).sort({ name: 1, _id: 1 }).skip((page - 1) * 50).limit(51).lean();
  res.json({ guests: users.slice(0, 50).map(view), hasMore: users.length > 50, page });
});
router.get('/:id/bookings', async (req, res) => {
  const page = pageNumber(req.query.page);
  if (!page || !idOK(req.params.id)) return res.status(400).json({ error: 'Invalid guest or page.' });
  const user = await User.findOne({ _id: req.params.id, role: 'guest' }).select(fields).lean();
  if (!user) return res.status(404).json({ error: 'Guest not found.' });
  const rows = await Booking.find({ guest: user._id }).select('typeName roomNumber checkIn checkOut status holdUntil totalCents paidCents refundedCents').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(51).lean();
  res.json({ guest: view(user), page, hasMore: rows.length > 50, bookings: rows.slice(0, 50).map((b) => ({
    id: String(b._id), type: b.typeName, roomNumber: b.roomNumber, checkIn: b.checkIn, checkOut: b.checkOut,
    status: b.status === 'pending-payment' && b.holdUntil <= new Date() ? 'expired' : b.status,
    totalCents: b.totalCents, paidCents: b.paidCents, refundedCents: b.refundedCents || 0,
  })) });
});
const writes = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
function requireWrite(req, res) {
  const token = req.get('X-CSRF-Token'), expected = req.session.csrfToken;
  if (!token || !expected || Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    res.status(403).json({ error: 'Refresh and try again.' });
    return false;
  }
  if (!req.is('application/json')) {
    res.status(415).json({ error: 'Send JSON.' });
    return false;
  }
  return true;
}
router.post('/:id/contact', writes, async (req, res) => {
  if (!requireWrite(req, res)) return;
  const b = req.body || {};
  if (!idOK(req.params.id) || typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 100 ||
    typeof b.phone !== 'string' || (b.phone !== '' && !/^09\d{9}$/.test(b.phone)) ||
    typeof b.contactEmail !== 'string' || b.contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.contactEmail.trim()) ||
    typeof b.updatedAt !== 'string' || !Number.isFinite(Date.parse(b.updatedAt))) return res.status(400).json({ error: 'Enter a name, valid contact email, and an optional 11-digit 09 mobile number.' });
  // Explicit fields prevent staff contact editing from changing roles, passwords or login email.
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'guest', updatedAt: new Date(b.updatedAt) },
    { $set: { name: b.name.trim(), contactEmail: b.contactEmail.trim().toLowerCase(), phone: b.phone } },
    { returnDocument: 'after', runValidators: true }).select(fields).lean();
  if (!user) return res.status(409).json({ error: 'Guest changed or is unavailable. Close and reopen the profile before saving.' });
  res.json({ guest: view(user) });
});

router.delete('/:id', writes, async (req, res) => {
  if (!requireWrite(req, res)) return;
  const b = req.body || {};
  if (!idOK(req.params.id) || typeof b.updatedAt !== 'string' || !Number.isFinite(Date.parse(b.updatedAt)) || b.confirm !== true) {
    return res.status(400).json({ error: 'Confirm account deactivation and refresh the guest record.' });
  }
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'guest', active: true, updatedAt: new Date(b.updatedAt) },
    { $set: { active: false }, $inc: { sessionVersion: 1 } }, { returnDocument: 'after', runValidators: true }).select(fields).lean();
  if (!user) return res.status(409).json({ error: 'Guest changed, is already inactive, or is unavailable. Refresh and try again.' });
  await PasswordResetToken.deleteOne({ userId: user._id });
  res.json({ guest: view(user), message: 'Guest account disabled. Booking history has been retained.' });
});

router.post('/:id/restore', writes, async (req, res) => {
  if (!requireWrite(req, res)) return;
  const b = req.body || {};
  if (!idOK(req.params.id) || typeof b.updatedAt !== 'string' || !Number.isFinite(Date.parse(b.updatedAt))) {
    return res.status(400).json({ error: 'Refresh the guest record before restoring it.' });
  }
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'guest', active: false, updatedAt: new Date(b.updatedAt) },
    { $set: { active: true }, $inc: { sessionVersion: 1 } }, { returnDocument: 'after', runValidators: true }).select(fields).lean();
  if (!user) return res.status(409).json({ error: 'Guest changed or is already active. Refresh and try again.' });
  await PasswordResetToken.deleteOne({ userId: user._id });
  res.json({ guest: view(user), message: 'Guest account restored. Sign in again to start a new session.' });
});
module.exports = router;
