const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },


    reportedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    reason: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["chat", "profile"],
      default: "profile",
      index: true
    },
    evidence: [
      {
        text: String,
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        sentAt: Date
      }
    ],
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      default: null,
      index: true
    },
    description: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["new", "in_progress", "resolved"],
      default: "new",
      index: true
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },

    replyHistory: [
      {
        message: String,
        repliedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        repliedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    resolvedAt: {
      type: Date,
      default: null
    },


     // NEW: Admin reply fields
  adminReply: {
    type: String,
    default: null
  },
  repliedAt: {
    type: Date,
    default: null
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },

    actionAudit: [
      {
        action: {
          type: String, 
          enum: ["delete_message", "warn_user", "block_user", "freeze_chat", "note"],
          required: true
        },
        reason: { type: String, required: true },
        matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", index: true }, messageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" }], targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, actedAt: { type: Date, default: Date.now }
      }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);



// resolution: { type: String, default: null }
// actionAudit: [ { action: { type: String, enum: ["delete_message","warn_user","block_user","freeze_chat","note"], required: true }, reason: { type: String, required: true }, matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", index: true }, messageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" }], targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, actedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // admin as User actedAt: { type: Date, default: Date.now } } ]