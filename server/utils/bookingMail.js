const MailJob = require('../models/MailJob'), User = require('../models/User');
module.exports = async function bookingMail(booking, kind, session) {
  const guest = booking.source === 'walk-in' ? booking.walkInGuest : await User.findById(booking.guest).select('name email contactEmail').session(session);
  const to = guest?.contactEmail || guest?.email;
  if (!to) return;
  const titles = { confirmation: 'Booking confirmation', cancellation: 'Booking cancelled', checkout: 'Checkout receipt' };
  const money = (n) => 'PHP ' + (n / 100).toFixed(2);
  const text = ['Twin Lakes', titles[kind], '', `Hello ${guest.name},`, `Booking reference: ${booking._id}`,
    `Room type: ${booking.typeName}`, `Stay: ${booking.checkIn} to ${booking.checkOut}`,
    `Status: ${booking.status}`, kind === 'confirmation' ? 'Your booking is confirmed. We look forward to welcoming you.' : kind === 'checkout' ? 'Your checkout is complete. Thank you for staying with Twin Lakes.' : 'Your booking has been cancelled.', `Total: ${money(booking.totalCents)}`, `Payments recorded: ${money(booking.paidCents)}`,
    `Refunds recorded: ${money(booking.refundedCents || 0)}`, '', 'Keep this message for your records.'].join('\n');
  // The outbox entry commits in the same transaction as the booking change.
  await MailJob.updateOne({ key: `${booking._id}:${kind}` }, { $setOnInsert: { booking: booking._id, kind, to,
    subject: titles[kind] + ' - ' + booking._id, text, status: 'preview' } }, { upsert: true, session });
};
