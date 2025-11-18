// src/modules/profile/profile.model.js
const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['male','female','other'], default: 'other' },
  bio: { type: String, maxlength: 1000 },
  photos: [{ url: String, order: Number, isPrimary: Boolean }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ProfileSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Profile', ProfileSchema);