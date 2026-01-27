const mongoose = require("mongoose");

const giveawayWinHistorySchema = new mongoose.Schema(
  {
    // Winner user 
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Kis campaign (date) ka win tha
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GiveawayCampaign",
      required: true,
    },

    // Kaunsa prize jeeta
    prizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GiveawayPrize",
      required: true,
    },

    // Win kab hua
    wonAt: { type: Date, default: Date.now },

    claimedAt: { type: Date, default: null },

    deliveryStatus: {
      type: String,
      enum: ["PENDING", "DELIVERED"],
      default: "PENDING",
    },

    // Year (fast yearly limit check ke liye)
    year: { type: Number, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// 🚫 Ek user ek campaign sirf ek hi baar jeet sakta hai
giveawayWinHistorySchema.index({ userId: 1, campaignId: 1 }, { unique: true });

module.exports = mongoose.model("GiveawayWinHistory", giveawayWinHistorySchema);
