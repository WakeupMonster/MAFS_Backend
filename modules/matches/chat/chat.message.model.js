const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatMessageSchema = new Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "" },

    // For image/video messages
    media: {
      url: String,
      publicId: String,
      type: { type: String, enum: ["image", "video"], default: null },
    },

    // Read receipts (WhatsApp-style)
    read: {
      type: Boolean,
      default: false,
    },

    // Timestamps
    readAt: {
      type: Date,
      default: null,
    },

    // ⭐ Soft delete → deleted only for specific user(s)
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
