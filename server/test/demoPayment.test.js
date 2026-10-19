const test = require('node:test');
const assert = require('node:assert/strict');
const demoPaymentLabel = require('../utils/demoPayment');

test('demo payments allow bank transfer only', () => {
  assert.equal(demoPaymentLabel('Bank Transfer'), 'Demo payment via Bank Transfer');
});

test('unsupported demo payment methods are rejected', () => {
  for (const method of ['GCash', 'Maya', 'Card', 'Cash', undefined]) {
    assert.throws(() => demoPaymentLabel(method), (error) => error.status === 400);
  }
});
