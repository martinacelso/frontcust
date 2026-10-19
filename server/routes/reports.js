const express = require('express');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { authenticated, requireRoles } = require('../middleware/auth');
const { rangeInput, occupancyRows } = require('../utils/reportRules');
const router = express.Router();
router.use(authenticated, requireRoles('admin'));
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const range = rangeInput(req.query.from, req.query.to);
  if (!range) return res.status(400).json({ error: 'Choose valid dates spanning at most 90 days, including both dates.' });
  const now = new Date();
  const arrival = { checkIn: { $gte: range.from, $lte: range.to } };
  const activity = (field) => Booking.aggregate([
    { $match: { [field]: { $gte: range.start, $lt: range.end } } },
    { $group: { _id: { $dateToString: { date: '$' + field, format: '%Y-%m-%d', timezone: 'Asia/Manila' } }, count: { $sum: 1 } } },
  ]);
  const [bookings, payments, ins, outs, guestIds, roomCount, stays] = await Promise.all([
    Booking.aggregate([
      { $match: arrival },
      { $group: { _id: { $cond: [{ $and: [{ $eq: ['$status', 'pending-payment'] }, { $lte: ['$holdUntil', now] }] }, 'expired', '$status'] }, count: { $sum: 1 }, bookedCents: { $sum: '$totalCents' } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $project: { entries: [
        { $mergeObjects: ['$simulatedPayment', { kind: 'Deposit' }] },
        { $mergeObjects: ['$simulatedSettlement', { kind: 'Balance payment' }] },
        { $mergeObjects: ['$simulatedRefund', { kind: 'Refund' }] },
      ] } },
      { $unwind: '$entries' },
      { $match: { 'entries.reference': { $type: 'string', $ne: '' }, 'entries.recordedAt': { $gte: range.start, $lt: range.end }, 'entries.amountCents': { $gte: 0 } } },
      { $group: { _id: { date: { $dateToString: { date: '$entries.recordedAt', format: '%Y-%m-%d', timezone: 'Asia/Manila' } }, kind: '$entries.kind', method: { $ifNull: ['$entries.method', 'Method not recorded'] } }, count: { $sum: 1 }, cents: { $sum: '$entries.amountCents' } } },
      { $sort: { '_id.date': 1, '_id.kind': 1, '_id.method': 1 } },
    ]),
    activity('checkedInAt'), activity('checkedOutAt'),
    Booking.distinct('guest', { ...arrival, status: { $in: ['confirmed', 'checked-in', 'checked-out'] } }),
    Room.countDocuments({ archivedAt: null }),
    Booking.find({ checkedInAt: { $lt: range.end }, $or: [{ checkedOutAt: { $gte: range.start } }, { status: 'checked-in' }] }).select('room status checkedInAt checkedOutAt').lean(),
  ]);
  const inMap = new Map(ins.map((r) => [r._id, r.count])), outMap = new Map(outs.map((r) => [r._id, r.count]));
  const totals = payments.reduce((sum, row) => {
    if (row._id.kind === 'Refund') sum.refundsCents += row.cents;
    else sum.paymentsCents += row.cents;
    return sum;
  }, { paymentsCents: 0, refundsCents: 0 });
  res.json({ from: range.from, to: range.to, generatedAt: now, bookings,
    uniqueGuestAccounts: guestIds.length, ...totals, netCents: totals.paymentsCents - totals.refundsCents,
    payments: payments.map((r) => ({ ...r._id, count: r.count, cents: r.cents })),
    activity: range.days.map((date) => ({ date, checkIns: inMap.get(date) || 0, checkOuts: outMap.get(date) || 0 })),
    occupancy: occupancyRows(stays, range.days, roomCount, now) });
});
module.exports = router;
