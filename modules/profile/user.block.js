const mongoose = require("mongoose");

const BlockSchema = new mongoose.Schema({
  blockerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

// Index taaki duplicate block na ho
BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
// Index for fast feed exclusion queries
BlockSchema.index({ blockedId: 1 });
module.exports = mongoose.model("Block", BlockSchema);