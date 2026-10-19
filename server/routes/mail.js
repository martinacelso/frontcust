const express = require('express');
const { rateLimit } = require('express-rate-limit');
const MailJob = require('../models/MailJob');
const { authenticated, requireRoles } = require('../middleware/auth');
const { failure } = require('../utils/transaction');
const router = express.Router();
router.use(authenticated, requireRoles('admin'), require('../middleware/jsonWrite'));
router.get('/', async (req, res) => {
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw failure(400, 'Invalid page.');
  const rows = await MailJob.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(51).lean();
  res.json({ smtpEnabled: false, page, hasMore: rows.length > 50,
    jobs: rows.slice(0, 50).map((j) => ({ id: String(j._id), to: j.to, subject: j.subject, text: j.text, status: j.status, attempts: j.attempts,
      lastError: j.lastError, createdAt: j.createdAt, sentAt: j.sentAt })) });
});
router.post('/:id/retry', rateLimit({ windowMs: 60000, limit: 10 }), async (req, res) => {
  throw failure(409, 'Messages are available inside guest profiles. External email sending is disabled.');

});
module.exports = router;
