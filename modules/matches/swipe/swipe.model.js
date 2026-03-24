const mongoose = require("mongoose");

const SwipeSchema = new mongoose.Schema(
  {
    swiperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["like", "pass", "superlike"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// prevent duplicate swipe (same swiper -> same target)
SwipeSchema.index({ swiperId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("Swipe", SwipeSchema);

const MatchSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    matchedAt: {
      type: Date,
      default: Date.now,
    },

    // 🔥 CHAT LIST OPTIMIZATION
    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastMessageBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 🔥 OPTIONAL (future unread optimization)
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// 🔥 UNIQUE MATCH PAIR (ORDER-INDEPENDENT)
MatchSchema.index({ "users.0": 1, "users.1": 1 }, { unique: true });

// 🔥 FAST CHAT LIST FETCH
MatchSchema.index({ users: 1, lastMessageAt: -1 });

module.exports.Match = mongoose.model("Match", MatchSchema);
