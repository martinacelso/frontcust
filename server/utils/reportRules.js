function rangeInput(from, to) {
  const valid = (v) => typeof v === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!valid(from) || !valid(to)) return null;
  const count = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (count < 1 || count > 90) return null;
  const days = Array.from({ length: count }, (_, i) => new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10));
  return { from, to, days, start: new Date(from + 'T00:00:00+08:00'), end: new Date(new Date(to + 'T00:00:00+08:00').getTime() + 86400000) };
}
const phDate = (value) => new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 10);
function occupancyRows(stays, days, roomCount, now = new Date()) {
  const today = phDate(now);
  return days.map((date) => {
    // Only completed overnight periods count; today and future nights remain unreported.
    if (date >= today) return { date, occupied: null, rooms: roomCount, percent: null };
    const rooms = new Set(stays.filter((b) => b.checkedInAt && phDate(b.checkedInAt) <= date &&
      (b.checkedOutAt ? phDate(b.checkedOutAt) > date : b.status === 'checked-in')).map((b) => String(b.room)));
    return { date, occupied: rooms.size, rooms: roomCount, percent: roomCount ? Math.round(rooms.size / roomCount * 1000) / 10 : null };
  });
}
module.exports = { rangeInput, occupancyRows };
