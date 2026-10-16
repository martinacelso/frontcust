import { hotelDate } from './hotel.js'

// Shared client-side checks. Return an error message, or an empty string.
export const clean = (value) => String(value ?? '').trim()
export const emailKey = (value) => clean(value).toLowerCase()
export function textError(value, label, max = 100) {
  const text = clean(value)
  if (!text) return `${label} is required.`
  if (text.length > max) return `${label} must be ${max} characters or fewer.`
  if ([...text].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return `${label} contains invalid control characters.`
  return ''
}
export function emailError(value) {
  const email = emailKey(value)
  return email.length <= 254 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)
    ? '' : 'Enter a valid email address.'
}
export function phoneError(value, required = false) {
  const phone = clean(value)
  if (!phone && !required) return ''
  const compact = phone.replace(/[\s()-]/g, '')
  return /^\+?\d{7,15}$/.test(compact) ? '' : 'Enter a valid phone number with 7–15 digits.'
}
// Accept local or +63 Philippine mobile format; store the local 11-digit form.
export function normalizePhMobile(value) {
  const compact = clean(value).replace(/[\s()-]/g, '')
  return /^\+639\d{9}$/.test(compact) ? '0' + compact.slice(3) : compact
}
export function phMobileError(value) {
  const phone = normalizePhMobile(value)
  if (!phone) return '' // Phone remains optional.
  return /^09\d{9}$/.test(phone) ? '' : 'Enter a Philippine mobile number: 09 followed by 9 digits, or +639 followed by 9 digits.'
}
export function passwordError(value) {
  return typeof value === 'string' && value.length >= 6 && value.length <= 20 && value.trim()
    ? '' : 'Password must contain 6–20 characters and cannot be only spaces.'
}
export function profileError(data, records = [], id) {
  return textError(data.name, 'Full name') || emailError(data.email) || phoneError(data.phone) ||
    (records.some((r) => r.id !== id && emailKey(r.email) === emailKey(data.email))
      ? 'This email address is already in use.' : '')
}
export function guestError(data) {
  return textError(data.firstName, 'First name') || textError(data.lastName, 'Last name') ||
    emailError(data.email) || phoneError(data.phone, true) ||
    (!['Passport', 'Driver’s License', 'National ID', 'SSS/UMID', 'Other'].includes(data.idType)
      ? 'Select a valid ID type.' : '') || textError(data.idNumber, 'ID number', 50)
}
export function localDate(date = new Date()) {
  return hotelDate(date)
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function stayError(data, { allowPast = false, capacity } = {}) {
  if (!validDate(data.in) || !validDate(data.out)) return 'Choose valid check-in and check-out dates.'
  if (!allowPast && data.in < localDate()) return 'Check-in cannot be in the past.'
  if (data.out <= data.in) return 'Check-out must be after check-in.'
  if (!Number.isInteger(data.adults) || data.adults < 1 || data.adults > 50) return 'Adults must be a whole number from 1 to 50.'
  if (!Number.isInteger(data.children) || data.children < 0 || data.children > 50) return 'Children must be a whole number from 0 to 50.'
  if (capacity != null && data.adults + data.children > capacity) return `This room accommodates at most ${capacity} guests.`
  if (clean(data.requests ?? data.note).length > 1000) return 'Special requests must be 1,000 characters or fewer.'
  if (data.arrivalTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.arrivalTime)) return 'Enter a valid arrival time.'
  return ''
}
export function moneyError(value, label = 'Amount', { allowZero = false, max = 999999999 } = {}) {
  const text = clean(value)
  const amount = Number(text)
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(amount) ||
      (allowZero ? amount < 0 : amount <= 0) || amount > max) {
    return `${label} must be ${allowZero ? 'zero or a positive' : 'a positive'} amount with at most two decimal places, no greater than ${max}.`
  }
  return ''
}
export function luhnValid(value) {
  if (!/^\d{13,19}$/.test(value) || /^0+$/.test(value)) return false
  let sum = 0
  let double = false
  for (let i = value.length - 1; i >= 0; i--) {
    let digit = Number(value[i])
    if (double) { digit *= 2; if (digit > 9) digit -= 9 }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}
