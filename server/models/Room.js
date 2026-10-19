const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true, uppercase: true, maxlength: 20,
    match: /^[A-Z0-9][A-Z0-9 -]*$/, unique: true },
  roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true, index: true },
  status: { type: String, enum: ['available', 'occupied', 'dirty', 'maintenance'], default: 'dirty' },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  archivedAt: Date,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
