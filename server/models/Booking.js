const mongoose = require('mongoose');
const integerMoney = { type: Number, required: true, min: 0, validate: Number.isSafeInteger };
const schema = new mongoose.Schema({
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: function () { return this.source !== 'walk-in'; }, index: true },
  source: { type: String, enum: ['online', 'walk-in'], default: 'online' },
  walkInGuest: { name: { type: String, maxlength: 100 }, email: { type: String, maxlength: 254 }, phone: { type: String, maxlength: 11 } },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  typeName: { type: String, required: true },
  roomNumber: { type: String, required: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  adults: { type: Number, required: true, min: 1, max: 50, validate: Number.isInteger },
  children: { type: Number, required: true, min: 0, max: 49, validate: Number.isInteger },
  requests: { type: String, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending-payment', 'confirmed', 'checked-in', 'checked-out', 'cancelled'], default: 'pending-payment' },
  holdUntil: { type: Date, required: true },
  rateCents: integerMoney,
  totalCents: integerMoney,
  depositCents: integerMoney,
  paidCents: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  currency: { type: String, enum: ['PHP'], default: 'PHP' },
  requestId: { type: String, required: true },
  fingerprint: { type: String, required: true },
  cancelledAt: Date,
  refundedCents: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  simulatedRefund: {
    reference: String, method: String, originalReference: String,
    amountCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    recordedAt: Date,
  },
  checkedInAt: Date,
  checkedOutAt: Date,
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  simulatedSettlement: {
    reference: String,
    detailsLabel: { type: String, maxlength: 100 },
    method: { type: String, enum: ['GCash', 'Maya', 'Card', 'Bank Transfer'] },
    amountCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    recordedAt: Date,
  },
  simulatedPayment: {
    reference: String,
    detailsLabel: { type: String, maxlength: 100 },
    method: { type: String, enum: ['GCash', 'Maya', 'Card', 'Bank Transfer'] },
    amountCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    recordedAt: Date,
  },
}, { timestamps: true });
schema.index({ guest: 1, requestId: 1 }, { unique: true });
schema.index({ room: 1, checkIn: 1, checkOut: 1, status: 1 });
module.exports = mongoose.model('Booking', schema);
