const test = require('node:test');
const assert = require('node:assert/strict');
const { bankDetailsFingerprint, encryptBankDetails, normalizeBankDetails } = require('../utils/bankDetails');

const originalSecret = process.env.SESSION_SECRET;
const details = { bankName: 'Example Bank', accountHolder: 'Test Guest', accountNumber: '1234-5678 9012' };

test.before(() => { process.env.SESSION_SECRET = 'test-session-secret-'.repeat(4); });
test.after(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
});

test('normalizes a bank account number and validates required bank fields', () => {
  assert.deepEqual(normalizeBankDetails(details), {
    bankName: 'Example Bank', accountHolder: 'Test Guest', accountNumber: '123456789012',
  });
  assert.throws(() => normalizeBankDetails({ ...details, accountNumber: '1234x' }),
    (error) => error.status === 400);
  assert.throws(() => normalizeBankDetails({ ...details, bankName: '' }),
    (error) => error.status === 400);
});

test('encrypts bank details and returns only the final four digits separately', () => {
  const first = encryptBankDetails(details);
  const second = encryptBankDetails(details);
  assert.equal(first.bankAccountLast4, '9012');
  assert.equal(typeof first.bankDetailsEncrypted.ciphertext, 'string');
  assert.notEqual(first.bankDetailsEncrypted.ciphertext, JSON.stringify(normalizeBankDetails(details)));
  assert.notEqual(first.bankDetailsEncrypted.iv, second.bankDetailsEncrypted.iv);
  assert.equal(bankDetailsFingerprint(details), bankDetailsFingerprint(details));
  assert.notEqual(bankDetailsFingerprint(details), bankDetailsFingerprint({ ...details, accountNumber: '9999' }));
});
