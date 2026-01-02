const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatMessageSchema = new Schema(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },

    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },

    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },

    text: { type: String, default: "" },

    media: [
      {
        url: String,
        publicId: String,
        originalName: String,
        type: {
          type: String,
          enum: ["image", "video", "gif"],
        },
      },
    ],

    status: {
      type: String,
      enum: ["sent", "unread", "delivered", "read"],
      // "sent = grey ✓ ", "unread = grey ✓✓", "delivered = grey ✓✓", "read = blue ✓✓"
      default: "sent",
    },

    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },

    // Read receipts (WhatsApp-style)
    read: {
      type: Boolean,
      default: false,
    },

    readAt: { type: Date, default: null },

    deletedFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ matchId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
// 🔥 Indexes
// ChatMessageSchema.index({ matchId: 1, createdAt: -1 });
// ChatMessageSchema.index({ receiver: 1, status: 1 });
// ChatMessageSchema.index({ sender: 1 });
