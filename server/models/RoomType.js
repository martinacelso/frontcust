const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  rate: { type: Number, required: true, min: 0.01, max: 10000000,
    validate: { validator: (v) => Number.isFinite(v) && Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, message: 'Use at most two decimal places.' } },
  capacity: { type: Number, required: true, min: 1, max: 50, validate: Number.isInteger },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  image: { type: String, trim: true, maxlength: 300, default: '/room-1.jpg',
    match: /^\/(?!\/)[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp|avif)$/ },
  archivedAt: Date,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

roomTypeSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
module.exports = mongoose.model('RoomType', roomTypeSchema);
