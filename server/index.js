const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const RoomType = require('./models/RoomType');
const Room = require('./models/Room');
const Booking = require('./models/Booking');
const bookingRoutes = require('./routes/bookings');

const Audit = require('./models/Audit');
const AdminLock = require('./models/AdminLock');
const MailJob = require('./models/MailJob');
const PasswordResetToken = require('./models/PasswordResetToken');
async function startServer() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in server/.env.');
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 64) {
    throw new Error('Set SESSION_SECRET to the generated 64-character value in server/.env.');
  }
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), RoomType.init(), Room.init(), Booking.init(), Audit.init(), AdminLock.init(), MailJob.init(), PasswordResetToken.init()]);
  await AdminLock.updateOne({ _id: 'staff' }, { $setOnInsert: { revision: 0 } }, { upsert: true });
  console.log('MongoDB connected');

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', async (req, res) => {
    try {
      await mongoose.connection.db.admin().ping();
      res.json({ message: 'Backend is running', database: 'Connected' });
    } catch {
      res.status(503).json({ message: 'Database is unavailable' });
    }
  });

  const store = MongoStore.create({
    client: mongoose.connection.getClient(),
    dbName: mongoose.connection.name,
    collectionName: 'sessions', ttl: 60 * 60 * 8,
  });
  store.on('error', () => console.error('Session storage error. Check MongoDB.'));
  app.use('/api', session({
    name: 'frontcust.sid', secret: process.env.SESSION_SECRET,
    resave: false, saveUninitialized: false, store,
    cookie: { httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/' },
  }));
  app.use('/api', require('./middleware/audit'));
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/guests', require('./routes/guests'));
  app.use('/api/staff', require('./routes/staff'));
  app.use('/api/audit', require('./routes/audit'));
  app.use('/api/mail', require('./routes/mail'));
  app.use('/api/inbox', require('./routes/inbox'));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.status && error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.name === 'ValidationError') return res.status(400).json({ error: 'Check the supplied account details.' });
    console.error('Request failed:', error.name);
    res.status(500).json({ error: 'Unable to complete the request. Please try again.' });
  });

  // Booking messages are delivered to the profile inbox only; no SMTP worker starts.
  const server = app.listen(port, '127.0.0.1', () => console.log(`Backend running at http://127.0.0.1:${port}`));
  server.on('error', (error) => {
    console.error('Server failed to start:', error.code);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error('Startup failed:', error.name, error.code || 'Check MongoDB and server/.env settings.');
  process.exit(1);
});
