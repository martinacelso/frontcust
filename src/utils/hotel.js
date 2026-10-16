// Hotel calendar dates are always Asia/Manila; event timestamps remain UTC.
export function hotelDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type).value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export function addDays(date, count) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + count)
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : ''
}
export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
export const cents = (value) => Math.round(Number(value) * 100)
export const stayNights = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 864e5)
export const successful = (p) => !p.status || p.status === 'succeeded'
export const collected = (b) => roundMoney((b.pays || []).filter(successful).reduce((s, p) => s + Number(p.a), 0))
export const refunded = (b) => roundMoney((b.refunds || []).filter(successful).reduce((s, p) => s + Number(p.a), 0))
export const netCollected = (b) => roundMoney(collected(b) - refunded(b))
export const billTotal = (b) => roundMoney(stayNights(b.in, b.out) * b.rate + (b.extras || []).reduce((s, x) => s + Number(x.a), 0) - Number(b.disc || 0))
// Confirmed cancellations keep their original quote for history but have no stay balance.
export const balanceDue = (b) => b.st === 'cancelled' ? 0 : roundMoney(Math.max(0, billTotal(b) - netCollected(b)))

// Active-booking refunds reopen the balance. Completed stays allow excess-only refunds.
export const refundLimit = (b) => roundMoney(Math.max(0, b.st === 'checked-out' ? netCollected(b) - billTotal(b) : netCollected(b)))

export function actualStay(b, today = hotelDate()) {
  const start = b.checkedInAt ? hotelDate(b.checkedInAt) : null
  if (!start) return null
  const end = b.checkedOutAt ? hotelDate(b.checkedOutAt) : addDays(today, 1)
  return { start, end }
}
