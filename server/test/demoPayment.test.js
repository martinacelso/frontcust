const test = require('node:test');
const assert = require('node:assert/strict');
const demoPaymentLabel = require('../utils/demoPayment');

test('demo payment methods need no personal or financial details', () => {
  for (const method of ['GCash', 'Maya', 'Card', 'Bank Transfer']) {
    assert.equal(demoPaymentLabel(method), `Demo payment via ${method}`);
  }
});

test('unsupported demo payment methods are rejected', () => {
  assert.throws(() => demoPaymentLabel('Cash'), (error) => error.status === 400);
  assert.throws(() => demoPaymentLabel(undefined), (error) => error.status === 400);
});
