// File: modules/matches/swipe/userLimits.model.js
const mongoose = require('mongoose');

const UserLimitSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  dailyLikes: {
    type: Number,
    default: 0,
    min: 0
  },
  dailySuperlikes: {
    type: Number,
    default: 0,
    min: 0
  },
  lastReset: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Reset counters daily
UserLimitSchema.methods.resetIfNeeded = function() {
  const now = new Date();
  const lastReset = new Date(this.lastReset);
  
  // Check if it's a new day (comparing dates only, not time)
  const isNewDay = now.toDateString() !== lastReset.toDateString();
  
  if (isNewDay) {
    this.dailyLikes = 0;
    this.dailySuperlikes = 0;
    this.lastReset = now;
  }
  return isNewDay;
};

// Index for faster lookups
UserLimitSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('UserLimit', UserLimitSchema);