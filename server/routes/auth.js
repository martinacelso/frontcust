const express = require('express');
const bcrypt = require('bcryptjs');
const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { authenticated, requireRoles } = require('../middleware/auth');
const { transaction, failure } = require('../utils/transaction');
const passwordResetMail = require('../utils/passwordResetMail');

const router = express.Router();
const safeUser = (u) => ({
  id: String(u._id), name: u.name, email: u.email,
  phone: u.phone, contactEmail: u.contactEmail || u.email, role: u.role, createdAt: u.createdAt,
});
const sessionAction = (req, method) => new Promise((resolve, reject) => {
  req.session[method]((error) => error ? reject(error) : resolve());
});

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/csrf', async (req, res) => {
  req.session.csrfToken ||= randomBytes(32).toString('hex');
  await sessionAction(req, 'save');
  res.json({ csrfToken: req.session.csrfToken });
});

router.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.get('X-CSRF-Token');
  const expected = req.session.csrfToken;
  if (!sent || !expected || Buffer.byteLength(sent) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(sent), Buffer.from(expected))) {
    return res.status(403).json({ error: 'Refresh the form and try again.' });
  }
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Send the request as JSON.' });
  }
  next();
});

const limit = (max = 20) => rateLimit({
  windowMs: 15 * 60 * 1000, limit: max,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

function credentials(body) {
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') return null;
  const email = body.email.trim().toLowerCase();
  const password = body.password;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return null;
  return { email, password };
}

router.post('/signup', limit(), async (req, res) => {
  const login = credentials(req.body);
  if (!login) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (typeof req.body.name !== 'string') return res.status(400).json({ error: 'Enter your full name.' });
  const name = req.body.name.trim();
  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Name must contain 2 to 100 characters.' });
  if (req.body.phone != null && typeof req.body.phone !== 'string') return res.status(400).json({ error: 'Enter a valid Philippine mobile number.' });
  let phone = (req.body.phone || '').replace(/[\s-]/g, '');
  if (phone.startsWith('+63')) phone = '0' + phone.slice(3);
  if (phone && !/^09\d{9}$/.test(phone)) return res.status(400).json({ error: 'Use an 11-digit mobile number starting with 09, or its +63 equivalent.' });
  try {
    await User.create({ name, email: login.email, phone,
      passwordHash: await bcrypt.hash(login.password, 12), role: 'guest', active: true });
    // Signup intentionally does not authenticate the new account.
    res.status(201).json({ message: 'Account successfully created. Please sign in.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
});

router.post('/login', limit(), async (req, res) => {
  const login = credentials(req.body);
  if (!login) return res.status(401).json({ error: 'Invalid email or password.' });
  const user = await User.findOne({ email: login.email }).select('+passwordHash');
  if (!user || !user.active || !(await bcrypt.compare(login.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  await sessionAction(req, 'regenerate');
  req.session.userId = String(user._id);
  req.session.sessionVersion = user.sessionVersion || 0;
  req.session.csrfToken = randomBytes(32).toString('hex');
  await sessionAction(req, 'save');
  res.json({ user: safeUser(user), csrfToken: req.session.csrfToken });
});

const validEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const validPassword = (s) => typeof s === 'string' && s.length >= 8 && Buffer.byteLength(s, 'utf8') <= 72;

router.post('/password-reset/request', limit(5), async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    passwordResetMail.config();
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.message });
  }

  const user = await User.findOne({ email, active: true }).select('_id name email');
  if (user) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await PasswordResetToken.updateOne(
      { userId: user._id },
      { $set: { tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } },
      { upsert: true, runValidators: true }
    );
    try {
      await passwordResetMail.sendPasswordReset({ email: user.email, name: user.name, token });
    } catch (error) {
      console.error('Password reset email delivery failed:', error.code || error.name);
      try {
        await PasswordResetToken.deleteOne({ userId: user._id, tokenHash });
      } catch (cleanupError) {
        console.error('Unable to remove undelivered password reset token:', cleanupError.code || cleanupError.name);
      }
    }
  }
  res.status(202).json({
    message: 'If an active account uses that email, a reset link will arrive shortly. Check your spam folder or contact the administrator if it does not.',
  });
});

router.post('/password-reset/complete', limit(5), async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f\d]{64}$/i.test(token) || !validPassword(password)) {
    return res.status(400).json({ error: 'Use a valid reset link and a password of at least 8 characters (72 UTF-8 bytes maximum).' });
  }
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const passwordHash = await bcrypt.hash(password, 12);
  await transaction(async (session) => {
    const reset = await PasswordResetToken.findOneAndDelete({
      tokenHash, expiresAt: { $gt: new Date() },
    }).session(session);
    if (!reset) throw failure(400, 'This password reset link is invalid, expired, or already used. Request a new link.');
    const user = await User.findOneAndUpdate(
      { _id: reset.userId, active: true },
      { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
      { session, new: true, runValidators: true }
    );
    if (!user) throw failure(400, 'This password reset link is invalid, expired, or already used. Request a new link.');
  });
  res.json({ message: 'Password reset successfully. Sign in with your new password.' });
});

router.post('/profile', limit(), authenticated, async (req, res) => {
  const b = req.body || {};
  if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 100) return res.status(400).json({ error: 'Name must contain 2 to 100 characters.' });
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const contactEmail = typeof b.contactEmail === 'string' ? b.contactEmail.trim().toLowerCase() : '';
  if (!validEmail(email) || !validEmail(contactEmail)) return res.status(400).json({ error: 'Enter valid login and contact email addresses.' });
  if (typeof b.phone !== 'string') return res.status(400).json({ error: 'Enter a valid Philippine mobile number, or leave it blank.' });
  let phone = b.phone.replace(/[\s-]/g, '');
  if (phone.startsWith('+63')) phone = '0' + phone.slice(3);
  if (phone && !/^09\d{9}$/.test(phone)) return res.status(400).json({ error: 'Use an 11-digit mobile number starting with 09, or its +63 equivalent.' });
  const original = req.account;
  if (email !== original.email && (!validPassword(b.currentPassword) || !(await bcrypt.compare(b.currentPassword, original.passwordHash)))) {
    return res.status(400).json({ error: 'Enter your correct current password to change your login email.' });
  }
  try {
    // Allow-list fields; the browser cannot change role, active, or another account.
    const user = await User.findOneAndUpdate(
      { _id: original._id, active: true, passwordHash: original.passwordHash, email: original.email },
      { $set: { name: b.name.trim(), email, contactEmail, phone } },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(409).json({ error: 'Your account changed. Refresh and try again.' });
    if (email !== original.email) await PasswordResetToken.deleteOne({ userId: original._id });
    res.json({ message: 'Profile updated.', user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
});

router.post('/password', limit(), authenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!validPassword(currentPassword) || !(await bcrypt.compare(currentPassword, req.account.passwordHash))) return res.status(400).json({ error: 'Current password is incorrect.' });
  if (!validPassword(newPassword)) return res.status(400).json({ error: 'Use at least 8 characters and at most 72 UTF-8 bytes for your new password.' });
  if (await bcrypt.compare(newPassword, req.account.passwordHash)) return res.status(400).json({ error: 'Choose a different new password.' });
  const user = await User.findOneAndUpdate(
    { _id: req.account._id, active: true, passwordHash: req.account.passwordHash },
    { $set: { passwordHash: await bcrypt.hash(newPassword, 12) }, $inc: { sessionVersion: 1 } },
    { new: true, runValidators: true }
  );
  if (!user) return res.status(409).json({ error: 'Your account changed. Sign in again and retry.' });
  await PasswordResetToken.deleteOne({ userId: user._id });
  // Existing sessions become invalid; retain this session with a fresh identifier.
  try {
    await sessionAction(req, 'regenerate');
    req.session.userId = String(user._id);
    req.session.sessionVersion = user.sessionVersion;
    req.session.csrfToken = randomBytes(32).toString('hex');
    await sessionAction(req, 'save');
  } catch {
    return res.status(503).json({ error: 'Your password was changed, but your session could not be renewed. Sign in with your new password.' });
  }
  res.json({ message: 'Password updated. Other sessions have been signed out.', user: safeUser(user), csrfToken: req.session.csrfToken });
});

router.get('/me', authenticated, async (req, res) => {
  res.json({ user: safeUser(req.account) });
});

router.post('/logout', async (req, res) => {
  await sessionAction(req, 'destroy');
  res.clearCookie('frontcust.sid', { path: '/' });
  res.json({ message: 'Signed out successfully.' });
});

router.get('/staff/me', authenticated, requireRoles('admin', 'front-desk', 'housekeeping'), (req, res) => {
  res.json({ user: safeUser(req.account) });
});

module.exports = router;
