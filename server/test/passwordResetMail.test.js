const test = require('node:test');
const assert = require('node:assert/strict');
const { config } = require('../utils/passwordResetMail');

const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'APP_ORIGIN', 'NODE_ENV'];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function setEnvironment(values) {
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

test.afterEach(() => setEnvironment(original));

test('requires complete SMTP settings without exposing credentials', () => {
  setEnvironment({});
  assert.throws(() => config(), (error) => error.status === 503 && /SMTP_HOST/.test(error.message));
});

test('uses TLS by default on SMTP port 465 and accepts a local frontend origin', () => {
  setEnvironment({
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '465',
    SMTP_USER: 'mailer@example.test',
    SMTP_PASSWORD: 'test-only-password',
    SMTP_FROM: 'Hotel <mailer@example.test>',
    APP_ORIGIN: 'http://localhost:5173',
  });
  const settings = config();
  assert.equal(settings.secure, true);
  assert.equal(settings.origin.origin, 'http://localhost:5173');
});

test('rejects non-HTTPS frontend origins in production', () => {
  setEnvironment({
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_USER: 'mailer@example.test',
    SMTP_PASSWORD: 'test-only-password',
    SMTP_FROM: 'mailer@example.test',
    APP_ORIGIN: 'http://hotel.example.test',
    NODE_ENV: 'production',
  });
  assert.throws(() => config(), (error) => error.status === 503 && /HTTPS/.test(error.message));
});
