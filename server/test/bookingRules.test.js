const test = require('node:test');
const assert = require('node:assert/strict');
const { stayInput, quote, fingerprint } = require('../utils/bookingRules');

test('stay input validates a date range and returns normalized booking fields', () => {
  const now = new Date('2026-10-19T04:00:00.000Z');
  const result = stayInput({
    roomTypeId: '0123456789abcdef01234567',
    checkIn: '2026-10-19',
    checkOut: '2026-10-21',
    adults: 2,
    children: 1,
    requests: '  Late arrival  ',
  }, now);
  assert.equal(result.nights, 2);
  assert.equal(result.requests, 'Late arrival');
});

test('stay input rejects invalid dates, room ids and capacities', () => {
  const now = new Date('2026-10-19T04:00:00.000Z');
  const valid = {
    roomTypeId: '0123456789abcdef01234567',
    checkIn: '2026-10-19',
    checkOut: '2026-10-20',
    adults: 1,
    children: 0,
  };
  assert.equal(stayInput({ ...valid, checkOut: '2026-02-30' }, now), null);
  assert.equal(stayInput({ ...valid, roomTypeId: 'invalid' }, now), null);
  assert.equal(stayInput({ ...valid, adults: 0 }, now), null);
});

test('booking quotes use integer cents and stable request fingerprints', () => {
  const type = { rate: 123.45 };
  const input = { checkIn: '2026-10-19', checkOut: '2026-10-21', adults: 2 };
  const price = quote(type, 2);
  assert.deepEqual(price, { rateCents: 12345, totalCents: 24690, depositCents: 4938, currency: 'PHP' });
  assert.equal(fingerprint(input, price.totalCents), fingerprint(input, price.totalCents));
  assert.notEqual(fingerprint(input, price.totalCents), fingerprint(input, price.totalCents + 1));
});
