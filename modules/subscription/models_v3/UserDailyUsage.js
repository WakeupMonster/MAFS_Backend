const mongoose = require('mongoose');

const userDailyUsageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey: { type: String, required: true }, // Format: "YYYY-MM-DD" in AEST
    likesUsed: { type: Number, default: 0 },
    rewindsUsed: { type: Number, default: 0 },
    superKeensUsed: { type: Number, default: 0 }, // For Premium users (daily quota)
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'user_daily_usages'
});

// Unique index to prevent duplicate records for the same day
userDailyUsageSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('UserDailyUsage', userDailyUsageSchema);
