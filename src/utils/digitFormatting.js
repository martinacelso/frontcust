export const digitsOnly = (value, limit = Infinity) => String(value ?? '').replace(/\D/g, '').slice(0, limit)
export const formats = {
  phone: { groups: [4, 3, 4], separator: ' ', limit: 11 },
  card: { groups: [4, 4, 4, 4], separator: ' ', limit: 16 },
  bank: { groups: [20], separator: '', limit: 20 },
  cvv: { groups: [4], separator: '', limit: 4 },
  expiry: { groups: [2, 2], separator: '/', limit: 4 },
}
export function formatDigits(value, mode = 'phone') {
  const { groups, separator, limit } = formats[mode]
  const raw = digitsOnly(value, limit), parts = []; let at = 0
  for (const length of groups) { const part = raw.slice(at, at + length); if (part) parts.push(part); at += length }
  return parts.join(separator)
}
export function caretAfterDigits(text, count) {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) if (/\d/.test(text[i]) && ++seen === count) return i + 1
  return text.length
}
// Insert only the digits that fit. Preserve digits after the selection.
export function replaceDigits(display, start, end, inserted, limit) {
  const raw = digitsOnly(display), left = digitsOnly(display.slice(0, start)).length, right = digitsOnly(display.slice(0, end)).length
  const addition = digitsOnly(inserted, Math.max(0, limit - (raw.length - (right - left))))
  return { raw: raw.slice(0, left) + addition + raw.slice(right), caret: left + addition.length }
}
