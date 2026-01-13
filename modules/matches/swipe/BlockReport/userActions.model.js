const mongoose = require("mongoose");

const UserActionSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ["block", "report"],
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reason: {
    type: String, // only for report
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent a user from blocking/reporting same person repeatedly
UserActionSchema.index(
  { actionType: 1, actorId: 1, targetId: 1 },
  { unique: true }
);


UserActionSchema.index({ actorId: 1, targetId: 1, actionType: 1 }, { unique: true });
UserActionSchema.index({ targetId: 1, actionType: 1 });

module.exports = mongoose.model("UserAction", UserActionSchema);