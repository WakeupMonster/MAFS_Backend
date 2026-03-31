const mongoose = require("mongoose");

const giveawayCampaignSchema = new mongoose.Schema(
  {
    // NAYA: Campaign ka title (Example: "Week 1 Draw", "Easter Special")
    title: {
      type: String,
      trim: true,
      index: true,
    },

    // Giveaway kis date ka hai (daily unique)
    date: {
      type: Date,
      required: true,
      unique: true,
    },

    // Us din ka prize (Prize Scheduling ka base)
    prizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GiveawayPrize",
      required: true,
    },

    // Cron job state (crash-safe & multi-server safe)
    drawStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED"],
      default: "PENDING",
      index: true,
    },

    // Winner user (draw complete hone ke baad)
    winnerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Draw kab run hua (audit & debugging)
    drawAt: {
      type: Date,
      default: null,
    },

    // Agar draw skip / fail hua to reason
    failureReason: {
      type: String,
      default: null,
    },
    supportiveItems: {
      type: [String],
      default: [],
    },

    // Admin control: feature enable / disable
    isActive: {
      type: Boolean,
      default: true,
    },
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    totalParticipants: {
      type: Number,
      default: 0,
    },

    matchWindowStart: {
      type: Date,
      default: null,
    },

    matchWindowEnd: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("GiveawayCampaign", giveawayCampaignSchema);