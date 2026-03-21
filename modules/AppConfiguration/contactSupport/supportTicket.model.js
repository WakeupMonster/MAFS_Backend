const mongoose = require("mongoose");

const SupportTicketSchema = new mongoose.Schema(
  {
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
      required: true,
    },

    subject: { type: String, required: true, trim: true },

    message: { type: String, required: true },

    attachments: [{ url: String, publicId: String }],

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    adminReply: { type: String },

    repliedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
