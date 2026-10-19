const { failure } = require('./transaction');
module.exports = function demoPaymentLabel(method) {
  if (method !== 'Bank Transfer') throw failure(400, 'Only bank transfer is available.');
  return `Demo payment via ${method}`;
};
