const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  kind: { type: String, enum: ['confirmation', 'cancellation', 'checkout'], required: true },
  to: { type: String, required: true }, subject: String, text: String,
  status: { type: String, enum: ['preview', 'pending', 'sending', 'sent', 'failed', 'cancelled'], default: 'preview' },
  attempts: { type: Number, default: 0 }, lastError: String, lockedAt: Date, sentAt: Date,
}, { timestamps: true });
schema.index({ status: 1, createdAt: 1 });
module.exports = mongoose.model('MailJob', schema);
