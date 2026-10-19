const express = require('express');
const Audit = require('../models/Audit');
const { authenticated, requireRoles } = require('../middleware/auth');
const { rangeInput } = require('../utils/reportRules');
const { failure, transaction } = require('../utils/transaction');
const router = express.Router();
router.use(authenticated, requireRoles('admin'), require('../middleware/jsonWrite'));
router.get('/', async (req, res) => {
  const range = rangeInput(req.query.from, req.query.to), page = Number(req.query.page || 1), q = req.query.q || '';
  if (!range || !Number.isInteger(page) || page < 1 || page > 10000 || typeof q !== 'string' || q.length > 100) throw failure(400, 'Choose valid dates within 90 days and a valid search.');
  const filter = { createdAt: { $gte: range.start, $lt: range.end },
    ...(req.query.includeArchived === 'true' ? {} : { archivedAt: null }) };
  if (q.trim()) filter.action = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const rows = await Audit.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(51).populate('actorId', 'name email').lean();
  res.json({ page, hasMore: rows.length > 50, logs: rows.slice(0, 50).map((r) => ({ id: String(r._id), at: r.createdAt,
    actor: r.actorId?.name || 'Unauthenticated / unavailable', role: r.role || '', action: r.action,
    outcome: r.outcome === 'started' ? 'Unknown / in progress' : r.outcome, statusCode: r.statusCode,
    version: r.__v || 0, archived: Boolean(r.archivedAt) })) });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params, { version, confirm } = req.body || {};
  if (!/^[a-f\d]{24}$/i.test(id) || !Number.isInteger(version) || version < 0 || confirm !== true) {
    throw failure(400, 'Confirm audit entry archival and refresh its version.');
  }
  const event = await transaction(async (session) => {
    const archived = await Audit.findOneAndUpdate({ _id: id, __v: version, archivedAt: null },
      { $set: { archivedAt: new Date(), archivedBy: req.account._id }, $inc: { __v: 1 } },
      { session, returnDocument: 'after' });
    if (!archived) throw failure(409, 'Audit entry changed or is already archived. Refresh and try again.');
    await Audit.create([{
      actorId: req.account._id, role: req.account.role, action: `DELETE /audit/${id}`,
      outcome: 'accepted', statusCode: 200, completedAt: new Date(),
    }], { session });
    return archived;
  });
  res.json({ id: String(event._id), archived: true });
});

router.post('/:id/restore', async (req, res) => {
  const { id } = req.params, { version } = req.body || {};
  if (!/^[a-f\d]{24}$/i.test(id) || !Number.isInteger(version) || version < 0) throw failure(400, 'Invalid audit entry or version.');
  const event = await transaction(async (session) => {
    const restored = await Audit.findOneAndUpdate({ _id: id, __v: version, archivedAt: { $ne: null } },
      { $unset: { archivedAt: 1, archivedBy: 1 }, $inc: { __v: 1 } },
      { session, returnDocument: 'after' });
    if (!restored) throw failure(409, 'Audit entry changed or is already active. Refresh and try again.');
    await Audit.create([{
      actorId: req.account._id, role: req.account.role, action: `POST /audit/${id}/restore`,
      outcome: 'accepted', statusCode: 200, completedAt: new Date(),
    }], { session });
    return restored;
  });
  res.json({ id: String(event._id), archived: false });
});
module.exports = router;
