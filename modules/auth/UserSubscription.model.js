// existing: modules/matches/swipe/userSubscription.model.js
const mongoose = require('mongoose');

const UserSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Plan Info
  planId: { type: String, enum: ['free', 'gold', 'platinum'], default: 'free' },
  isActive: { type: Boolean, default: false },
  expiryDate: { type: Date, default: null },

  // Consumption (Meter Reading)
  dailyLikesUsed: { type: Number, default: 0 },
  dailySuperlikesUsed: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },

  // Inventory (Purchased Packs)
  superlikeBalance: { type: Number, default: 0 } // Extra superlikes bought separately

  // boostsCount: { type: Number, default: 0 },      // 👈 New: Kitne boosts bache hain
  // rewindsCount: { type: Number, default: 0 }
}, { timestamps: true });

// Aapka existing reset logic (Method)
UserSubscriptionSchema.methods.resetIfNeeded = function() {
  const now = new Date();
  const lastReset = new Date(this.lastReset);
  if (now.toDateString() !== lastReset.toDateString()) {
    this.dailyLikesUsed = 0;
    this.dailySuperlikesUsed = 0;
    this.lastReset = now;
    return true;
  }
  return false;
};

module.exports = mongoose.model('UserSubscription', UserSubscriptionSchema);