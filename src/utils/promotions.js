import { addDays, stayNights, roundMoney, hotelDate } from './hotel.js'
import { validDate } from './validation.js'
export const PROMOTIONS = [
  {
    id: 'long-stay',
    badge: 'SAVE 15%',
    title: 'Long Stay Discount',
    description:
      'Book 3 nights or more and save 15% on your room rate. Perfect for slow weekends and extended getaways.',
    valid: 'Valid for stays of 3+ nights',
    image: '/promo-1.jpg',
    discount: { type: 'percent', value: 15 },
    rule: { minNights: 3 },
    terms: [
      'Minimum 3 consecutive nights required.',
      'Discount applies to room rate only.',
      'Subject to availability at time of booking.',
      'Cannot be combined with other promotions.',
      'Not valid during peak season (Dec 20 – Jan 5).',
    ],
  },
  {
    id: 'weekday',
    badge: 'FREE UPGRADE',
    title: 'Weekday Escape',
    description:
      'Stay Sunday through Thursday and enjoy a complimentary room upgrade, subject to availability.',
    valid: 'Sun–Thu arrivals only',
    image: '/promo-2.jpg',
    discount: { type: 'upgrade', value: 0 },
    rule: { weekdaysOnly: [0, 1, 2, 3, 4] }, // Sun=0 ... Thu=4
    terms: [
      'Valid for check-ins on Sunday, Monday, Tuesday, Wednesday, or Thursday.',
      'Free upgrade is one category higher, subject to availability at check-in.',
      'Not valid for suite categories.',
      'Standard cancellation policy applies.',
    ],
  },
  {
    id: 'direct',
    badge: 'SAVE ₱2,000',
    title: 'Direct Booking Bonus',
    description:
      'Book directly with us and get ₱2,000 off your total. No code needed — just book from your account.',
    valid: 'Minimum 2-night stay',
    image: '/promo-3.jpg',
    discount: { type: 'fixed', value: 2000 },
    rule: { minNights: 2 },
    terms: [
      'Minimum 2-night stay required.',
      'Select this offer from your account before booking; the discount is then applied at checkout.',
      'One discount per booking.',
      'Non-transferable and non-refundable.',
      'Book and stay by December 31, 2026; check out no later than January 1, 2027.',
    ],
  },
]
export function promotionError(id, from, to, type, today = hotelDate()) {
  if (!id) return ''
  const promo = PROMOTIONS.find((p) => p.id === id)
  if (!promo) return 'This promotion is not available.'
  if (!validDate(from) || !validDate(to) || from >= to) return 'Choose valid dates for this promotion.'
  if (promo.rule.minNights && stayNights(from, to) < promo.rule.minNights) return 'This promotion requires at least ' + promo.rule.minNights + ' nights.'
  if (promo.rule.weekdaysOnly && !promo.rule.weekdaysOnly.includes(new Date(from + 'T00:00:00Z').getUTCDay())) return 'This promotion allows Sunday through Thursday arrivals only.'
  if (id === 'weekday' && /suite/i.test(type || '')) return 'The upgrade promotion does not apply to suites.'
  if (id === 'direct' && (today > '2026-12-31' || from > '2026-12-31' || to > '2027-01-01')) return 'The direct booking offer is valid for stays through December 31, 2026.'
  if (id === 'long-stay') {
    for (let d = from; d < to; d = addDays(d, 1)) {
      const md = d.slice(5)
      if (md >= '12-20' || md <= '01-05') return 'The long-stay offer is not valid December 20 through January 5.'
    }
  }
  return ''
}
export function quoteStay(type, from, to, promoId = null, rateOverride) {
  if (!type || !validDate(from) || !validDate(to) || from >= to) return { error: 'Choose a valid room type and stay.' }
  const error = promotionError(promoId, from, to, type.n)
  if (error) return { error }
  const rate = rateOverride ?? type.r
  if (!Number.isFinite(rate) || rate <= 0) return { error: 'This room does not have a valid rate.' }
  const gross = roundMoney(stayNights(from, to) * rate)
  const promo = PROMOTIONS.find((p) => p.id === promoId)
  let discount = 0
  let label = null
  if (promo?.discount.type === 'percent') { discount = roundMoney(gross * promo.discount.value / 100); label = promo.discount.value + '% off applied' }
  if (promo?.discount.type === 'fixed') { discount = Math.min(gross, promo.discount.value); label = 'Promotion discount applied' }
  if (promo?.discount.type === 'upgrade') label = 'Upgrade subject to availability at check-in'
  const total = roundMoney(gross - discount)
  return { rate, gross, discount, total, deposit: roundMoney(total * 0.2), label, promoId }
}
