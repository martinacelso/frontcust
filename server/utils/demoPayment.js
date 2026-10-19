const { failure } = require('./transaction');
const methods = ['GCash', 'Maya', 'Card', 'Bank Transfer'];
module.exports = function demoPaymentLabel(method) {
  if (!methods.includes(method)) throw failure(400, 'Choose GCash, Maya, Card or Bank Transfer.');
  return `Demo payment via ${method}`;
};
