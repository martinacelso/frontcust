const express = require('express'), bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User'), Lock = require('../models/AdminLock');
const PasswordResetToken = require('../models/PasswordResetToken');
const { authenticated, requireRoles } = require('../middleware/auth');
const { transaction, failure } = require('../utils/transaction');
const router = express.Router();
const roles = ['admin', 'front-desk', 'housekeeping'];
const view = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, active: u.active, department: u.department || '', updatedAt: u.updatedAt });
const passwordOK = (s) => typeof s === 'string' && s.length >= 8 && Buffer.byteLength(s) <= 72;
router.use(authenticated, requireRoles('admin'), require('../middleware/jsonWrite'));
router.get('/', async (req, res) => {
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw failure(400, 'Invalid page.');
  const rows = await User.find({ role: { $in: roles } }).select('name email role active department updatedAt').sort({ name: 1, _id: 1 }).skip((page - 1) * 50).limit(51);
  res.json({ staff: rows.slice(0, 50).map(view), page, hasMore: rows.length > 50 });
});
router.use(rateLimit({ windowMs: 900000, limit: 30, message: { error: 'Too many staff changes. Try again later.' } }));
router.post('/save', async (req, res) => {
  const b = req.body || {};
  if (!passwordOK(b.adminPassword) || !(await bcrypt.compare(b.adminPassword, req.account.passwordHash))) throw failure(403, 'Enter your current administrator password.');
  const editing = b.id !== undefined;
  if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 100 ||
    typeof b.email !== 'string' || b.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()) ||
    !roles.includes(b.role) || typeof b.active !== 'boolean' || typeof b.department !== 'string' || b.department.length > 80 ||
    (editing && (typeof b.id !== 'string' || !/^[a-f\d]{24}$/i.test(b.id) || typeof b.updatedAt !== 'string' || !Number.isFinite(Date.parse(b.updatedAt)))) ||
    (!editing && !passwordOK(b.password)) || (b.password && !passwordOK(b.password))) throw failure(400, 'Check name, email, role, department and password (8 characters minimum; 72 UTF-8 bytes maximum).');
  if (editing && b.id === String(req.account._id)) throw failure(400, 'Use My account to edit yourself. Another administrator can change your role.');
  const hash = b.password ? await bcrypt.hash(b.password, 12) : undefined;
  try {
    const saved = await transaction(async (session) => {
      // Serialize administrator changes so two admins cannot remove each other concurrently.
      await Lock.updateOne({ _id: 'staff' }, { $inc: { revision: 1 } }, { session });
      const actor = await User.findOne({ _id: req.account._id, role: 'admin', active: true,
        sessionVersion: req.account.sessionVersion || 0, passwordHash: req.account.passwordHash }).session(session);
      if (!actor) throw failure(403, 'Your administrator session changed. Sign in again.');
      const changes = { name: b.name.trim(), email: b.email.trim().toLowerCase(), role: b.role, active: b.active, department: b.department.trim() };
      if (hash) changes.passwordHash = hash;
      if (!editing) {
        const [u] = await User.create([changes], { session }); return u;
      }
      const old = await User.findOne({ _id: b.id, role: { $in: roles }, updatedAt: new Date(b.updatedAt) }).session(session);
      if (!old) throw failure(409, 'Staff account changed. Refresh before saving.');
      if (old.role === 'admin' && old.active && (b.role !== 'admin' || !b.active)) {
        if (await User.countDocuments({ role: 'admin', active: true }).session(session) <= 1) throw failure(409, 'Keep at least one active administrator.');
      }
      const updated = await User.findOneAndUpdate({ _id: old._id, updatedAt: old.updatedAt },
        { $set: changes, $inc: { sessionVersion: 1 } }, { session, returnDocument: 'after', runValidators: true });
      if (!updated) throw failure(409, 'Account changed. Refresh before saving.');
      await PasswordResetToken.deleteOne({ userId: old._id }, { session });
      return updated;
    });
    res.json({ staff: view(saved), message: 'Staff account saved. Existing sessions for edited accounts are invalidated.' });
  } catch (error) {
    if (error.code === 11000) throw failure(409, 'That email already belongs to an account. Refresh the staff list before retrying.');
    throw error;
  }
});
module.exports = router;
