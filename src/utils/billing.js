export const money = (cents) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100)
export function balanceDue(booking) {
  if (!['confirmed', 'checked-in', 'checked-out'].includes(booking.status)) return 0
  return Math.max(0, booking.totalCents - booking.paidCents)
}
export function paymentEntries(booking) {
  return [
    booking.simulatedPayment?.reference && { ...booking.simulatedPayment, label: 'Simulated deposit' },
    booking.simulatedSettlement?.reference && { ...booking.simulatedSettlement, label: 'Simulated balance payment' },
  ].filter(Boolean)
}
export function pageTotals(bookings) {
  return bookings.reduce((sum, b) => ({
    paid: sum.paid + b.paidCents,
    balance: sum.balance + balanceDue(b),
  }), { paid: 0, balance: 0 })
}
export function receiptText(b) {
  const entries = paymentEntries(b)
  return [
    'BOOKING PAYMENT SUMMARY',
    'Project demonstration — not an official receipt. No real money was collected.',
    '',
    `Booking reference: ${b.id}`,
    `Guest: ${b.guest?.name || 'Unavailable'}`,
    `Room: ${b.roomNumber} — ${b.type}`,
    `Stay: ${b.checkIn} to ${b.checkOut}`,
    `Status: ${b.status}`,
    `Booked price: ${money(b.totalCents)}`,
    `Recorded payments: ${money(b.paidCents)}`,
    `Outstanding balance: ${money(balanceDue(b))}`,
    '',
    'PAYMENT RECORDS',
    ...entries.map((p) => `${p.label}: ${money(p.amountCents)}\nReference: ${p.reference}\nRecorded: ${new Date(p.recordedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time)`),
    ...(!entries.length ? ['No payment records.'] : []),
    '',
    'Pending holds, expired holds and cancelled bookings are excluded from outstanding balance.',
    'This summary reflects the saved booking when downloaded.',
  ].join('\n')
}
