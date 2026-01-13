const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatRoomSchema = new Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      // unique: true,
    },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // 🔔 Last message preview (for chat list)
    lastMessage: {
      text: { type: String },
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      lastMessageAt: { type: Date },
    },

    // 🔢 Unread count per user
    unreadCount: {
      type: Map,
      of: Number, // userId -> count
      default: {},
    },
  },
  { timestamps: true }
);

// Create index properly
ChatRoomSchema.index({ matchId: 1 }, { unique: true });

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
// lastmessage, unread count, delete for, createdAt

// "Hey bro" 2 min ago
