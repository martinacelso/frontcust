export function isBankDetailsValid(details) {
  const bankName = typeof details?.bankName === 'string' ? details.bankName.trim() : ''
  const accountHolder = typeof details?.accountHolder === 'string' ? details.accountHolder.trim() : ''
  const accountNumber = typeof details?.accountNumber === 'string'
    ? details.accountNumber.replace(/[\s-]/g, '')
    : ''
  return bankName.length >= 2 && bankName.length <= 100 &&
    accountHolder.length >= 2 && accountHolder.length <= 100 &&
    /^\d{4,34}$/.test(accountNumber)
}
