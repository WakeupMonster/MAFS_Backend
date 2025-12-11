const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema(
  {
    matchId: { 
        type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, index: true 
    },
    from: {
      type: mongoose.Schema.Types.ObjectId, ref: "User", required: true
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "" },

    // For image/video messages
    media: {
      url: String, publicId: String,
      type: { type: String, enum: ["image", "video"], default: null },
    },
    
    // Read receipts (WhatsApp-style)
    isRead: {
      type: Boolean, default: false,
    },

    // Timestamps
    createdAt: {
      type: Date, default: Date.now,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model("Message", MessageSchema);
