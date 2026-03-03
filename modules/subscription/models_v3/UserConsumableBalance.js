const mongoose = require('mongoose');

const userConsumableBalanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    superKeensBalance: { type: Number, default: 0 },
    boostsBalance: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'user_consumable_balances'
});

module.exports = mongoose.model('UserConsumableBalance', userConsumableBalanceSchema);
