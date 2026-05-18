const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatMessageSchema = new Schema(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    text: {
      type: String,
      trim: true,
      default: ""
    },

    media: [
      {
        url: String,
        publicId: String,
        originalName: String,
        type: {
          type: String,
          enum: ["image", "video", "gif"]
        }
      }
    ],

    // 🔥 SINGLE SOURCE OF MESSAGE STATE
    status: {
      type: String,
      enum: ["SENT", "DELIVERED", "READ"],
      default: "SENT",
      index: true
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    readAt: {
      type: Date,
      default: null
    },

    // For delete-for-me feature
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    isDeletedForEveryone: {
      type: Boolean,
      default: false
    },

    // 🔥 Prevent duplicate messages on retry
    clientMessageId: {
      type: String,
      index: true
    }
  },
  { timestamps: true }
);

/* 🔥 IMPORTANT INDEXES */
ChatMessageSchema.index({ matchId: 1, createdAt: -1 }); // chat history
ChatMessageSchema.index({ receiver: 1, status: 1 });   // pending messages
ChatMessageSchema.index({ sender: 1 });
// ChatMessageSchema.index(
//   { sender: 1, clientMessageId: 1 },
//   { unique: true, sparse: true }
// );
module.exports = mongoose.model("ChatMessage", ChatMessageSchema);