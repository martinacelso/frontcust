const express = require('express');
const MailJob = require('../models/MailJob');
const { authenticated, requireRoles } = require('../middleware/auth');
const router = express.Router();
router.use(authenticated, requireRoles('guest'));
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return res.status(400).json({ error: 'Invalid inbox page.' });
  // Ownership comes from the authenticated account and booking, never an email supplied by the browser.
  const rows = await MailJob.aggregate([
    { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'reservation' } },
    { $match: { 'reservation.guest': req.account._id } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $skip: (page - 1) * 20 }, { $limit: 21 },
    { $project: { _id: 1, booking: 1, kind: 1, to: 1, subject: 1, text: 1, createdAt: 1 } },
  ]);
  res.json({ page, hasMore: rows.length > 20, messages: rows.slice(0, 20).map((row) => ({
    id: String(row._id), bookingId: String(row.booking), kind: row.kind,
    to: row.to, subject: row.subject, text: row.text, createdAt: row.createdAt,
  })) });
});
module.exports = router;
