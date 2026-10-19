const express = require('express');
const Audit = require('../models/Audit');
const { authenticated, requireRoles } = require('../middleware/auth');
const { rangeInput } = require('../utils/reportRules');
const { failure } = require('../utils/transaction');
const router = express.Router();
router.use(authenticated, requireRoles('admin'), require('../middleware/jsonWrite'));
router.get('/', async (req, res) => {
  const range = rangeInput(req.query.from, req.query.to), page = Number(req.query.page || 1), q = req.query.q || '';
  if (!range || !Number.isInteger(page) || page < 1 || page > 10000 || typeof q !== 'string' || q.length > 100) throw failure(400, 'Choose valid dates within 90 days and a valid search.');
  const filter = { createdAt: { $gte: range.start, $lt: range.end } };
  if (q.trim()) filter.action = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const rows = await Audit.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(51).populate('actorId', 'name email').lean();
  res.json({ page, hasMore: rows.length > 50, logs: rows.slice(0, 50).map((r) => ({ id: String(r._id), at: r.createdAt,
    actor: r.actorId?.name || 'Unauthenticated / unavailable', role: r.role || '', action: r.action,
    outcome: r.outcome === 'started' ? 'Unknown / in progress' : r.outcome, statusCode: r.statusCode })) });
});
module.exports = router;
