const mongoose = require("mongoose");

const SwipeSchema = new mongoose.Schema({
  swiperId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, enum: ["like", "pass", "superlike"], required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

// prevent duplicate swipe (same swiper -> same target)
SwipeSchema.index({ swiperId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("Swipe", SwipeSchema);


// Match model
const MatchSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  matchedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  lastMessageAt: Date
});
MatchSchema.index({ users: 1 }); // not unique because pair order may vary; we will ensure unique in service
module.exports.Match = mongoose.model("Match", MatchSchema);