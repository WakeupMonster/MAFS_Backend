const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productKey: { type: String, required: true, unique: true }, // e.g. "superkeen_5", "premium_1month"
    type: { type: String, enum: ['SUBSCRIPTION', 'CONSUMABLE'], required: true },
    planType: { type: String }, // e.g. "1_MONTH", "3_MONTH" (for subscriptions)
    durationDays: { type: Number }, // for subscriptions
    displayName: { type: String, required: true },
    subtitle: { type: String, default: null },   // e.g. "Most Popular", "Best Value"
    badge: { type: String, default: null },       // e.g. "🔥 HOT", "💎 BEST VALUE", "⭐ POPULAR"
    displayPrice: { type: String, required: true }, // e.g. "$9.95"
    currency: { type: String, default: 'AUD' },
    quantity: { type: Number, default: 0 }, // for consumable packs (e.g. 5 Super Keens)
    consumableType: { type: String, enum: ['SUPER_KEEN', 'BOOST'] },
    appleProductId: { type: String, required: true },
    googleProductId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
}, {
    timestamps: true,
    collection: 'products'
});
module.exports = mongoose.model('Product', productSchema);