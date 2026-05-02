const mongoose = require("mongoose");

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      // required: true, if existing tickets don't have it, better to not make it required at DB level immediately, or provide a default for old ones, but making it unique is fine if old documents are given one. Wait, if old docs don't have it, unique index will fail on null! Let's make it sparse or generated. For new ones, it's fine.
      sparse: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: String,
      enum: [
        "General",
        "Account",
        "Dating",
        "Subscriptions",
        "Troubleshooting",
        "Security & Privacy",
        "Safety & Reporting",
        "Other",
      ],
      required: false,
    },

    // subject: { type: String, required: false, trim: true },

    message: { type: String, required: false },

    reason: { type: String, required: false },

    description: { type: String, required: false },

    attachments: [{ url: String, publicId: String }],

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    adminReply: { type: String },
    adminAttachments: [{ url: String, publicId: String }],

    repliedAt: Date,
    appVersion: { type: String },
    appBuild: { type: String },
    platform: { type: String, enum: ["ios", "android", "web"] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
