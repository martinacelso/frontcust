const { createCipheriv, createHmac, hkdfSync, randomBytes } = require('node:crypto');
const { failure } = require('./transaction');

function normalizeBankDetails(input) {
  const bankName = typeof input?.bankName === 'string' ? input.bankName.trim() : '';
  const accountHolder = typeof input?.accountHolder === 'string' ? input.accountHolder.trim() : '';
  const accountNumber = typeof input?.accountNumber === 'string'
    ? input.accountNumber.replace(/[\s-]/g, '')
    : '';
  if (bankName.length < 2 || bankName.length > 100 ||
      accountHolder.length < 2 || accountHolder.length > 100 ||
      !/^\d{4,34}$/.test(accountNumber)) {
    throw failure(400, 'Enter a valid bank name, account holder, and account number.');
  }
  return { bankName, accountHolder, accountNumber };
}

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (typeof secret !== 'string' || secret.length < 64) {
    throw failure(503, 'Secure bank detail storage is unavailable. Check SESSION_SECRET in server/.env.');
  }
  return Buffer.from(hkdfSync(
    'sha256',
    Buffer.from(secret, 'utf8'),
    Buffer.from('frontcust-bank-details'),
    Buffer.from('aes-256-gcm-v1'),
    32
  ));
}

function encryptBankDetails(input) {
  const details = normalizeBankDetails(input);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(details), 'utf8'),
    cipher.final(),
  ]);
  return {
    bankDetailsEncrypted: {
      iv: iv.toString('base64url'),
      authTag: cipher.getAuthTag().toString('base64url'),
      ciphertext: ciphertext.toString('base64url'),
    },
    bankAccountLast4: details.accountNumber.slice(-4),
  };
}

function bankDetailsFingerprint(input) {
  const details = normalizeBankDetails(input);
  return createHmac('sha256', encryptionKey())
    .update(JSON.stringify(details))
    .digest('hex');
}

module.exports = { bankDetailsFingerprint, encryptBankDetails, normalizeBankDetails };
