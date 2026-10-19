const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254,
      validate: { validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Enter a valid contact email.' } },
    department: { type: String, trim: true, maxlength: 80, default: '' },
    sessionVersion: { type: Number, default: 0 },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (value) => value === '' || /^09\d{9}$/.test(value),
        message: 'Enter an 11-digit Philippine mobile number starting with 09.',
      },
    },

    role: {
      type: String,
      enum: ['guest', 'admin', 'front-desk', 'housekeeping'],
      default: 'guest',
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, result) {
        delete result.passwordHash;
        delete result.__v;
        return result;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);