const nodemailer = require('nodemailer');

function config() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !Number.isInteger(port) || port < 1 || port > 65535 ||
      !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    const error = new Error('Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM in server/.env.');
    error.status = 503;
    throw error;
  }
  if (process.env.SMTP_SECURE && !['true', 'false'].includes(process.env.SMTP_SECURE)) {
    const error = new Error('SMTP_SECURE must be true or false.');
    error.status = 503;
    throw error;
  }
  const appOrigin = process.env.APP_ORIGIN || 'http://localhost:5173';
  let origin;
  try { origin = new URL(appOrigin); } catch {
    const error = new Error('APP_ORIGIN must be a valid frontend URL.');
    error.status = 503;
    throw error;
  }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
      (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) {
    const error = new Error('APP_ORIGIN must use HTTPS in production and must not contain credentials.');
    error.status = 503;
    throw error;
  }
  return { host: SMTP_HOST, port, secure: process.env.SMTP_SECURE === 'true' || port === 465,
    user: SMTP_USER, password: SMTP_PASSWORD, from: SMTP_FROM, origin };
}

async function sendPasswordReset({ email, name, token }) {
  const settings = config();
  const transporter = nodemailer.createTransport({
    host: settings.host, port: settings.port, secure: settings.secure,
    requireTLS: !settings.secure,
    auth: { user: settings.user, pass: settings.password },
  });
  const link = new URL('/', settings.origin);
  link.hash = new URLSearchParams({ resetToken: token }).toString();
  await transporter.sendMail({
    from: settings.from,
    to: email,
    subject: 'Reset your Twin Lakes Hotel password',
    disableFileAccess: true,
    disableUrlAccess: true,
    text: [
      `Hello ${name},`,
      '',
      'We received a request to reset the password for your Twin Lakes Hotel account.',
      'Use this link within 30 minutes to choose a new password:',
      link.toString(),
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  });
}

module.exports = { config, sendPasswordReset };
