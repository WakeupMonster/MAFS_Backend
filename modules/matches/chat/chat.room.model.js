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

// Create index properly
ChatRoomSchema.index({ unique: true });

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
// lastmessage, unread count, delete for, createdAt
