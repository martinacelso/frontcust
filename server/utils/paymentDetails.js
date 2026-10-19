const { failure } = require('./transaction');
// Return a masked description only. Never store submitted wallet numbers.
module.exports = function paymentDetailsLabel(method, details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) throw failure(400, 'Enter payment details first.');
  const allowed = method === 'GCash' || method === 'Maya' ? ['mobile'] : method === 'Bank Transfer' ? ['bank', 'last4'] : ['last4'];
  if (Object.keys(details).some((key) => !allowed.includes(key))) throw failure(400, 'Unexpected payment details.');
  if (method === 'GCash' || method === 'Maya') {
    if (typeof details.mobile !== 'string' || !/^09\d{9}$/.test(details.mobile)) throw failure(400, 'Enter an 11-digit mobile number starting with 09.');
    return method + ' •••• ' + details.mobile.slice(-4);
  }
  if (typeof details.last4 !== 'string' || !/^\d{4}$/.test(details.last4)) throw failure(400, 'Enter payment details first.');
  if (method === 'Bank Transfer') {
    if (typeof details.bank !== 'string' || details.bank.trim().length < 2 || details.bank.trim().length > 80 || /[\r\n\x00-\x1f]/.test(details.bank)) throw failure(400, 'Enter a valid bank name.');
    return details.bank.trim() + ' •••• ' + details.last4;
  }
  if (method !== 'Card') throw failure(400, 'Invalid payment method.');
  return 'Card •••• ' + details.last4;
};
