const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: String, action: { type: String, required: true, maxlength: 160 },
  outcome: { type: String, enum: ['started', 'accepted', 'denied', 'error'], default: 'started' },
  statusCode: Number, completedAt: Date, archivedAt: Date,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ createdAt: -1, _id: -1 });
module.exports = mongoose.model('Audit', schema);
