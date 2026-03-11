const mongoose = require('mongoose');

const userMonthlyUsageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monthKey: { type: String, required: true }, // Format: "YYYY-MM" in AEST
    boostsUsed: { type: Number, default: 0 }, // For all users (monthly quota)
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'user_monthly_usages'
});

userMonthlyUsageSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

module.exports = mongoose.model('UserMonthlyUsage', userMonthlyUsageSchema);
