const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createAdmin() {
  const name = (process.env.ADMIN_NAME || '').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in server/.env.');
  if (name.length < 2 || name.length > 100) throw new Error('ADMIN_NAME is missing or invalid. Set it in server/.env to your name (2 to 100 characters), without the variable name in quotes.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set ADMIN_EMAIL to a valid email address.');
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must contain at least 8 characters and at most 72 UTF-8 bytes.');
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await User.init();
  // Never turn an existing guest account into an administrator or reset a password.
  if (await User.exists({ email })) throw new Error('This email already exists. No account was changed. Choose a different email.');
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, contactEmail: email, passwordHash,
    phone: '', role: 'admin', active: true, sessionVersion: 0 });
  console.log('Administrator account created successfully.');
  console.log('Remove ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD from server/.env now.');
}

createAdmin().catch((error) => {
  if (error.code === 11000) console.error('This email already exists. No account was changed.');
  else if (error.name === 'Error') console.error(error.message);
  else console.error(`Administrator creation failed (${error.name}${error.code ? `, code ${error.code}` : ''}). Check that check:database succeeds, then verify the admin settings in server/.env.`);
  process.exitCode = 1;
}).finally(async () => {
  delete process.env.ADMIN_PASSWORD;
  await mongoose.disconnect();
});
