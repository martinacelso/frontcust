const { createHash } = require('node:crypto');
const DAY = 86400000;
function today(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}
function stayInput(body, now = new Date()) {
  if (!body || typeof body.roomTypeId !== 'string' || !/^[a-f\d]{24}$/i.test(body.roomTypeId)) return null;
  const start = dateValue(body.checkIn), end = dateValue(body.checkOut);
  const nights = (end - start) / DAY;
  if (!Number.isInteger(nights) || nights < 1 || nights > 90 || body.checkIn < today(now) || start > dateValue(today(now)) + 365 * DAY) return null;
  if (!Number.isInteger(body.adults) || body.adults < 1 || body.adults > 50 || !Number.isInteger(body.children) || body.children < 0 || body.adults + body.children > 50) return null;
  const requests = body.requests === undefined ? '' : body.requests;
  if (typeof requests !== 'string' || requests.length > 1000) return null;
  return { roomTypeId: body.roomTypeId.toLowerCase(), checkIn: body.checkIn, checkOut: body.checkOut,
    adults: body.adults, children: body.children, requests: requests.trim(), nights };
}
function activeFilter(now = new Date()) {
  return { $or: [{ status: { $in: ['confirmed', 'checked-in'] } }, { status: 'pending-payment', holdUntil: { $gt: now } }] };
}
function fingerprint(input, totalCents) {
  return createHash('sha256').update(JSON.stringify({ ...input, totalCents })).digest('hex');
}
function quote(type, nights) {
  const rateCents = Math.round(type.rate * 100);
  const totalCents = rateCents * nights;
  return { rateCents, totalCents, depositCents: Math.round(totalCents * 0.2), currency: 'PHP' };
}
module.exports = { today, dateValue, stayInput, activeFilter, fingerprint, quote };
