import { actualStay, successful, roundMoney } from './hotel.js'

// Cash movements retain cancelled bookings, and refunds use their own record date.
export function paymentLedger(bookings) {
  return bookings.flatMap((b) => [
    ...(b.pays || []).filter(successful).map((p) => ({ ...p, bookingId: b.id, guestId: b.g, kind: 'Payment', amount: Number(p.a) })),
    ...(b.refunds || []).filter(successful).map((p) => ({ ...p, bookingId: b.id, guestId: b.g, kind: 'Refund', amount: -Number(p.a) })),
  ]).sort((a, b) => a.d.localeCompare(b.d))
}
export function netReceipts(bookings, from = '', to = '9999-12-31') {
  return roundMoney(paymentLedger(bookings).filter((p) => p.d >= from && p.d <= to).reduce((sum, p) => sum + p.amount, 0))
}
export function occupiedRooms(bookings, day, today) {
  const rooms = new Set()
  for (const b of bookings) {
    const stay = actualStay(b, today)
    if (b.room && stay && stay.start <= day && day < stay.end) rooms.add(b.room)
  }
  return rooms.size
}
