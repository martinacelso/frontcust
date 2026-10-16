import { luhnValid, textError } from '../utils/validation'
// Payment helpers for the down payment step.

export const E_WALLETS = ['GCash', 'Maya']
export const BANKS = ['BDO', 'BPI', 'Metrobank', 'Landbank', 'UnionBank', 'Security Bank', 'PNB', 'RCBC']

export const isEwallet = (method) => E_WALLETS.includes(method)

// Accepts 09XXXXXXXXX, +639XXXXXXXXX or 639XXXXXXXXX (spaces/dashes allowed).
// Returns the normalised 09XXXXXXXXX form, or null if it isn't a valid PH mobile number.
export function normalizePhMobile(input) {
  const digits = String(input || '').replace(/[\s\-()]/g, '')
  let n = null
  if (/^\+639\d{9}$/.test(digits)) n = '0' + digits.slice(3)
  else if (/^639\d{9}$/.test(digits)) n = '0' + digits.slice(2)
  else if (/^09\d{9}$/.test(digits)) n = digits
  return n
}

function cardBrand(n) {
  if (/^4/.test(n)) return 'Visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'Mastercard'
  if (/^3[47]/.test(n)) return 'Amex'
  if (/^35/.test(n)) return 'JCB'
  return 'Card'
}

// ---- Input formatters: they limit what can be typed, so wrong input never gets in ----

export const digitsOnly = (v, max) => String(v).replace(/\D/g, '').slice(0, max)

// PH mobile: 11 digits, must start with 09. Shown as 0917 123 4567.
// Pasting +63 917 123 4567 is converted to 0917 123 4567.
export function formatPhMobile(v) {
  let d = String(v).replace(/\D/g, '')
  if (d.startsWith('63')) d = '0' + d.slice(2)
  if (d[0] && d[0] !== '0') d = ''
  if (d[1] && d[1] !== '9') d = d[0]
  d = d.slice(0, 11)
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(' ')
}

// Card number: 16 digits (Visa, Mastercard, JCB), 15 for American Express.
export const isAmex = (v) => /^3[47]/.test(String(v).replace(/\D/g, ''))
export function formatCardNumber(v) {
  let d = String(v).replace(/\D/g, '')
  const amex = /^3[47]/.test(d)
  d = d.slice(0, amex ? 15 : 16)
  return amex
    ? [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ') // 4-6-5
    : d.replace(/(.{4})/g, '$1 ').trim() // 4-4-4-4
}
export const cvvLength = (cardNumber) => (isAmex(cardNumber) ? 4 : 3)

// Expiry: MM/YY, month limited to 01-12
export function formatExpiry(v) {
  let d = String(v).replace(/\D/g, '').slice(0, 4)
  if (d[0] > '1') d = '0' + d
  if (d.length >= 2 && (+d.slice(0, 2) > 12 || d.slice(0, 2) === '00')) d = d[0]
  d = d.slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d
}

// Bank account number: digits only. Lengths differ per bank, so we allow 10-16 digits.
export const ACCOUNT_MIN = 10
export const ACCOUNT_MAX = 16
export const formatAccountNumber = (v) => digitsOnly(v, ACCOUNT_MAX)

// Returns { error } or { ref } where ref is a masked, safe-to-store description.
export function validatePayment(method, d = {}) {
  if (isEwallet(method)) {
    const n = normalizePhMobile(d.phone)
    if (!n) return { error: `Enter the 11-digit mobile number linked to your ${method} account (starts with 09).` }
    return { ref: `${n.slice(0, 4)} ••• ${n.slice(-4)}` }
  }

  if (method === 'Card') {
    const nameError = textError(d.cardName, 'Name on card', 50)
    if (nameError) return { error: nameError }
    const num = String(d.cardNumber || '').replace(/\s/g, '')
    if (!String(d.cardName || '').trim()) return { error: 'Enter the name on the card.' }
    const need = /^3[47]/.test(num) ? 15 : 16
    if (num.length !== need || !luhnValid(num)) return { error: `Enter a valid ${need}-digit card number.` }
    const m = /^(\d{2})\/(\d{2})$/.exec(d.expiry || '')
    if (!m || +m[1] < 1 || +m[1] > 12) return { error: 'Enter the expiry date as MM/YY.' }
    const now = new Date()
    const expYear = 2000 + +m[2]
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && +m[1] < now.getMonth() + 1)) {
      return { error: 'This card has expired.' }
    }
    const cvvLen = cardBrand(num) === 'Amex' ? 4 : 3
    if (!new RegExp(`^\\d{${cvvLen}}$`).test(d.cvv || '')) return { error: `Enter the ${cvvLen}-digit security code (CVV).` }
    return { ref: `${cardBrand(num)} •••• ${num.slice(-4)} · ${d.cardName.trim()}` }
  }

  if (method === 'Bank transfer') {
    const nameError = textError(d.accountName, 'Account holder name', 50)
    if (nameError) return { error: nameError }
    if (!BANKS.includes(d.bank)) return { error: 'Select your bank.' }
    const acct = String(d.accountNumber || '').replace(/[\s-]/g, '')
    if (!/^\d+$/.test(acct) || acct.length < ACCOUNT_MIN || acct.length > ACCOUNT_MAX) {
      return { error: `Enter your bank account number (${ACCOUNT_MIN}-${ACCOUNT_MAX} digits).` }
    }
    if (!String(d.accountName || '').trim()) return { error: 'Enter the account holder name.' }
    return { ref: `${d.bank} •••• ${acct.slice(-4)} · ${d.accountName.trim()}` }
  }

  return { error: 'Choose a payment method.' }
}

// ---- Shared payment form fields (guest checkout + admin billing) ----
// Method-specific payment inputs (e-wallet / card / bank transfer), shared by the
// guest booking checkout and the admin billing "Record payment" dialog.
export function PaymentFields({ method, details, setField, error, idPrefix = 'pay' }) {
  return (
    <>
      {isEwallet(method) && (
        <>
          <label htmlFor={`${idPrefix}-phone`}>{method} mobile number</label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09XX XXX XXXX"
            maxLength={13}
            value={details.phone || ''}
            onChange={(e) => setField('phone', formatPhMobile(e.target.value))}
          />
          <p className="acc-muted acc-small">
            11-digit Philippine mobile number registered to the {method} account (starts with 09).
          </p>
        </>
      )}

      {method === 'Card' && (
        <>
          <label htmlFor={`${idPrefix}-cname`}>Name on card</label>
          <input
            id={`${idPrefix}-cname`}
            autoComplete="cc-name"
            maxLength={50}
            value={details.cardName || ''}
            onChange={(e) => setField('cardName', e.target.value)}
          />
          <label htmlFor={`${idPrefix}-cnum`}>Card number</label>
          <input
            id={`${idPrefix}-cnum`}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            value={details.cardNumber || ''}
            onChange={(e) => setField('cardNumber', formatCardNumber(e.target.value))}
          />
          <div className="pay-row">
            <div>
              <label htmlFor={`${idPrefix}-exp`}>Expiry</label>
              <input
                id={`${idPrefix}-exp`}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                maxLength={5}
                value={details.expiry || ''}
                onChange={(e) => setField('expiry', formatExpiry(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-cvv`}>CVV</label>
              <input
                id={`${idPrefix}-cvv`}
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={cvvLength(details.cardNumber) === 4 ? '••••' : '•••'}
                maxLength={cvvLength(details.cardNumber)}
                value={details.cvv || ''}
                onChange={(e) => setField('cvv', digitsOnly(e.target.value, cvvLength(details.cardNumber)))}
              />
            </div>
          </div>
        </>
      )}

      {method === 'Bank transfer' && (
        <>
          <label htmlFor={`${idPrefix}-bank`}>Bank</label>
          <select
            id={`${idPrefix}-bank`}
            value={details.bank || ''}
            onChange={(e) => setField('bank', e.target.value)}
          >
            <option value="">Select a bank</option>
            {BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <label htmlFor={`${idPrefix}-acctno`}>Account number</label>
          <input
            id={`${idPrefix}-acctno`}
            inputMode="numeric"
            placeholder="Digits only"
            maxLength={ACCOUNT_MAX}
            value={details.accountNumber || ''}
            onChange={(e) => setField('accountNumber', formatAccountNumber(e.target.value))}
          />
          <p className="acc-muted acc-small">{ACCOUNT_MIN}-{ACCOUNT_MAX} digits, numbers only.</p>
          <label htmlFor={`${idPrefix}-acct`}>Account holder name</label>
          <input
            id={`${idPrefix}-acct`}
            maxLength={50}
            value={details.accountName || ''}
            onChange={(e) => setField('accountName', e.target.value)}
          />
        </>
      )}

      {error && <p className="pay-error" role="alert">{error}</p>}
    </>
  )
}