export function paymentDetailsError(method, d = {}, now = new Date()) {
  if (method === 'GCash' || method === 'Maya') return /^09\d{9}$/.test(d.mobile || '') ? '' : 'Enter an 11-digit Philippine mobile number starting with 09.'
  if (!d.holder?.trim() || d.holder.trim().length < 2 || d.holder.trim().length > 100) return 'Enter the account holder name (2–100 characters).'
  if (method === 'Bank Transfer') {
    if (!d.bank?.trim() || d.bank.trim().length < 2 || d.bank.trim().length > 80) return 'Enter the bank name.'
    if (!/^\d{6,20}$/.test(d.account || '')) return 'Enter a bank account number containing 6–20 digits.'
    return ''
  }
  if (method !== 'Card') return 'Choose a payment method.'
  const number = (d.number || '').replace(/[ -]/g, '')
  if (!/^\d{13,19}$/.test(number) || /^(\d)\1+$/.test(number)) return 'Enter a valid card number.'
  let sum = 0
  for (let i = number.length - 1, double = false; i >= 0; i--, double = !double) {
    let digit = Number(number[i]); if (double) { digit *= 2; if (digit > 9) digit -= 9 } sum += digit
  }
  if (sum % 10 !== 0) return 'Check the card number.'
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(d.expiry || '')) return 'Enter expiry as MM/YY.'
  const [month, year] = d.expiry.split('/').map(Number)
  const local = new Date(now.getTime() + 8 * 3600000)
  if ((2000 + year) * 12 + month < local.getUTCFullYear() * 12 + local.getUTCMonth() + 1) return 'The card has expired.'
  if (!/^\d{3,4}$/.test(d.cvv || '')) return 'Enter a 3- or 4-digit security code.'
  return ''
}

// Full card numbers, expiry dates and CVVs never leave this form.
export function paymentDetailsPayload(method, details) {
  if (paymentDetailsError(method, details)) return null
  if (method === 'GCash' || method === 'Maya') return { mobile: details.mobile }
  if (method === 'Bank Transfer') return { bank: details.bank.trim(), last4: details.account.slice(-4) }
  return { last4: details.number.replace(/[ -]/g, '').slice(-4) }
}
