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

    media: {
      url: String,
      publicId: String,
      type: {
        type: String,
        enum: ["image", "video", "gif"],
        default: null,
      },
    },

    status: {
      type: String,
      enum: ["sent", "unread", "delivered", "read"],
      // "sent = grey ✓ ", "unread = grey ✓✓", "delivered = grey ✓✓", "read = blue ✓✓"
      default: "sent",
    },

    deliveredAt: { type: Date, default: null },

    readAt: { type: Date, default: null },

    deletedFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// 🔥 Indexes
// ChatMessageSchema.index({ matchId: 1, createdAt: -1 });
// ChatMessageSchema.index({ receiver: 1, status: 1 });
// ChatMessageSchema.index({ sender: 1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
