const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatRoomSchema = new Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      unique: true,
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Supports lookups/cleanup by participant (e.g. account-deletion cleanup).
// (Previous `ChatRoomSchema.index({ unique: true })` indexed a field named
// "unique" that doesn't exist on this schema — a no-op index; matchId above
// already has its own `unique: true` constraint.)
ChatRoomSchema.index({ participants: 1 });

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
// lastmessage, unread count, delete for, createdAt
