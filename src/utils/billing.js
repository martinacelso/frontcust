export const money = (cents) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100)
export function balanceDue(booking) {
  if (!['confirmed', 'checked-in', 'checked-out'].includes(booking.status)) return 0
  return Math.max(0, booking.totalCents - booking.paidCents)
}
export function paymentEntries(booking) {
  return [
    booking.simulatedPayment?.reference && { ...booking.simulatedPayment, label: 'Deposit' },
    booking.simulatedSettlement?.reference && { ...booking.simulatedSettlement, label: 'Balance payment' },
    booking.simulatedRefund?.reference && { ...booking.simulatedRefund, amountCents: -booking.simulatedRefund.amountCents, label: 'Refund' },
  ].filter(Boolean)
}
export function pageTotals(bookings) {
  return bookings.reduce((sum, b) => ({
    paid: sum.paid + b.paidCents,
    refunded: sum.refunded + (b.refundedCents || 0),
    net: sum.net + b.paidCents - (b.refundedCents || 0),
    balance: sum.balance + balanceDue(b),
  }), { paid: 0, refunded: 0, net: 0, balance: 0 })
}
export function receiptText(b) {
  const entries = paymentEntries(b)
  return [
    'PAYMENT RECEIPT',
    'Booking payment record — not an official receipt. No funds were transferred.',
    '',
    `Booking reference: ${b.id}`,
    `Guest: ${b.guest?.name || 'Unavailable'}`,
    `Room: ${b.roomNumber} — ${b.type}`,
    `Stay: ${b.checkIn} to ${b.checkOut}`,
    `Status: ${b.status}`,
    `Booked price: ${money(b.totalCents)}`,
    `Recorded payments: ${money(b.paidCents)}`,
    `Refunded: ${money(b.refundedCents || 0)}`,
    `Net retained: ${money(b.paidCents - (b.refundedCents || 0))}`,
    `Outstanding balance: ${money(balanceDue(b))}`,
    '',
    'PAYMENT RECORDS',
    ...entries.map((p) => `${p.label} — ${p.detailsLabel || p.method || 'Method not recorded'}: ${money(p.amountCents)}\nReference: ${p.reference}\nRecorded: ${new Date(p.recordedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time)`),
    ...(!entries.length ? ['No payment records.'] : []),
    '',
    'Pending holds, expired holds and cancelled bookings are excluded from outstanding balance.',
    'This summary reflects the saved booking when downloaded.',
  ].join('\n')
}
