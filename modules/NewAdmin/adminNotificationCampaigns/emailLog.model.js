const mongoose = require("mongoose");

const EmailLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: String,
    campaignId: { type: mongoose.Schema.Types.ObjectId },
    status: {
      type: String,
      enum: ["sent", "failed", "skipped"]
    },
    error: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailLog", EmailLogSchema);
