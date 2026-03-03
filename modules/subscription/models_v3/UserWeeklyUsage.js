const mongoose = require('mongoose');

const userWeeklyUsageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekKey: { type: String, required: true }, // Format: "YYYY-WW" (e.g. "2026-09") in AEST
    superKeensUsed: { type: Number, default: 0 }, // For Free users (weekly quota)
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'user_weekly_usages'
});

userWeeklyUsageSchema.index({ userId: 1, weekKey: 1 }, { unique: true });

module.exports = mongoose.model('UserWeeklyUsage', userWeeklyUsageSchema);
