const express = require('express');
const MailJob = require('../models/MailJob');
const Booking = require('../models/Booking');
const { authenticated, requireRoles } = require('../middleware/auth');
const router = express.Router();
router.use(authenticated, requireRoles('guest'), require('../middleware/jsonWrite'));
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return res.status(400).json({ error: 'Invalid inbox page.' });
  // Ownership comes from the authenticated account and booking, never an email supplied by the browser.
  const rows = await MailJob.aggregate([
    { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'reservation' } },
    { $match: { 'reservation.guest': req.account._id,
      ...(req.query.includeArchived === 'true' ? {} : { guestArchivedAt: null }) } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $skip: (page - 1) * 20 }, { $limit: 21 },
    { $project: { _id: 1, booking: 1, kind: 1, to: 1, subject: 1, text: 1, createdAt: 1, guestArchivedAt: 1 } },
  ]);
  res.json({ page, hasMore: rows.length > 20, messages: rows.slice(0, 20).map((row) => ({
    id: String(row._id), bookingId: String(row.booking), kind: row.kind,
    to: row.to, subject: row.subject, text: row.text, createdAt: row.createdAt,
    archived: Boolean(row.guestArchivedAt),
  })) });
});

router.delete('/:id', async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid message.' });
  const message = await MailJob.findById(req.params.id).select('booking guestArchivedAt');
  if (!message || !(await Booking.exists({ _id: message.booking, guest: req.account._id }))) {
    return res.status(404).json({ error: 'Message not found.' });
  }
  if (message.guestArchivedAt) return res.status(409).json({ error: 'Message is already archived.' });
  await MailJob.updateOne({ _id: message._id, guestArchivedAt: null }, { $set: { guestArchivedAt: new Date() } });
  res.json({ id: String(message._id), archived: true });
});

router.post('/:id/restore', async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid message.' });
  const message = await MailJob.findById(req.params.id).select('booking guestArchivedAt');
  if (!message || !(await Booking.exists({ _id: message.booking, guest: req.account._id }))) {
    return res.status(404).json({ error: 'Message not found.' });
  }
  if (!message.guestArchivedAt) return res.status(409).json({ error: 'Message is already active.' });
  await MailJob.updateOne({ _id: message._id, guestArchivedAt: { $ne: null } }, { $unset: { guestArchivedAt: 1 } });
  res.json({ id: String(message._id), archived: false });
});
module.exports = router;
