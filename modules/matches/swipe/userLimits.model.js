// File: modules/matches/swipe/userLimits.model.js
const mongoose = require('mongoose');
const { isSameAppDay } = require('../../../common/utils/time');

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

// Reset counters daily — day boundary is Australia/Sydney midnight (APP_TZ),
// not server-local time — see common/utils/time.js.
UserLimitSchema.methods.resetIfNeeded = function() {
  const now = new Date();

  // Check if it's a new day (comparing dates only, not time)
  const isNewDay = !isSameAppDay(now, this.lastReset);

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