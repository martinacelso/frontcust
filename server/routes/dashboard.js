const express = require('express');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { authenticated, requireRoles } = require('../middleware/auth');
const { today, activeFilter } = require('../utils/bookingRules');
const router = express.Router();

router.use(authenticated, requireRoles('admin', 'front-desk', 'housekeeping'));
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const now = new Date(), date = today(now);
  const day = (offset) => new Date(Date.parse(date + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
  const groups = await Room.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(groups.map((g) => [g._id, g.count]));
  const rooms = { total: groups.reduce((n, g) => n + g.count, 0), clean: counts.available || 0,
    occupied: counts.occupied || 0, dirty: counts.dirty || 0, maintenance: counts.maintenance || 0 };
  // Housekeeping receives room counts only, never guest or financial data.
  if (req.account.role === 'housekeeping') return res.json({ date, updatedAt: now, rooms });
  const blocked = await Booking.distinct('room', { ...activeFilter(now), checkIn: { $lt: day(1) }, checkOut: { $gt: date } });
  const [availableTonight, arrivals, departures, overdue, bookings, payments] = await Promise.all([
    Room.countDocuments({ status: 'available', _id: { $nin: blocked } }),
    Booking.countDocuments({ status: 'confirmed', checkIn: date }),
    Booking.countDocuments({ status: 'checked-in', checkOut: date }),
    Booking.countDocuments({ status: 'checked-in', checkOut: { $lt: date } }),
    Booking.countDocuments({}),
    Booking.aggregate([
      { $project: { entries: ['$simulatedPayment', '$simulatedSettlement', { $mergeObjects: ['$simulatedRefund', { isRefund: true }] }] } },
      { $unwind: '$entries' },
      { $match: { 'entries.reference': { $type: 'string', $ne: '' }, 'entries.amountCents': { $gte: 0 }, 'entries.recordedAt': { $type: 'date' } } },
      { $set: { signedCents: { $cond: ['$entries.isRefund', { $multiply: ['$entries.amountCents', -1] }, '$entries.amountCents'] } } },
      { $facet: {
        total: [{ $group: { _id: null, cents: { $sum: '$signedCents' } } }],
        days: [
          { $match: { 'entries.recordedAt': { $gte: new Date(day(-6) + 'T00:00:00+08:00'), $lt: new Date(day(1) + 'T00:00:00+08:00') } } },
          { $group: { _id: { $dateToString: { date: '$entries.recordedAt', format: '%Y-%m-%d', timezone: 'Asia/Manila' } }, cents: { $sum: '$signedCents' } } },
        ],
      } },
    ]),
  ]);
  const sums = new Map((payments[0]?.days || []).map((entry) => [entry._id, entry.cents]));
  res.json({ date, updatedAt: now, rooms: { ...rooms, availableTonight }, arrivals, departures, overdue, bookings,
    simulatedPaymentsCents: payments[0]?.total[0]?.cents || 0,
    days: Array.from({ length: 7 }, (_, i) => ({ date: day(i - 6), cents: sums.get(day(i - 6)) || 0 })) });
});
module.exports = router;
