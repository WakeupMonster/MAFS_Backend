const mongoose = require("mongoose");

const prizeSchema = new mongoose.Schema(
  {
    // Prize ka naam (admin ke liye)
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Prize ka type
    type: {
      type: String,
      enum: ["GIFT_CARD", "FREE_PREMIUM"],
      required: true,
    },

    // ➕ NAYA: FREE_PREMIUM ke liye konsa tier ka plan hai ("1_MONTH", "3_MONTH" etc)
    planType: {
      type: String,
      default: null
    },
    // ➕ NAYA: GIFT_CARD ke liye expiry date (optional)
    giftCardExpiryDate: {
      type: Date,
      default: null
    },

    // Monetary value (USD ya base currency)
    value: {
      type: Number,
      required: true,
    },

    durationInDays: {
      type: Number,
      default: null,
    },

    // Prize ka short description
    description: {
      type: String,
      trim: true,
    },

    // Spin wheel pe jo label dikhega
    spinWheelLabel: {
      type: String,
      required: true,
    },

    supportiveItems: {
      type: [String],
      default: [],
    },

    // Admin prize ko disable bhi kar sakta hai
    isActive: {
      type: Boolean,
      default: true,
    },

    // Admin reference / notes (optional but pro-level)
    adminNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GiveawayPrize", prizeSchema);
