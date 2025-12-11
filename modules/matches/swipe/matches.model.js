const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate match
MatchSchema.index(
  { user1: 1, user2: 1 },
  { unique: true }
);

module.exports = mongoose.model("Match", MatchSchema);