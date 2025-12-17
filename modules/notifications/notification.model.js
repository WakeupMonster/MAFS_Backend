const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // 🔑 Who will see this notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 📌 Type of notification
    type: {
      type: String,
      enum: [
        "NEW_MATCH",
        "NEW_MESSAGE",
        "CONNECTION_REQUEST",
        "SECURITY_ALERT",
        "EVENT_ALERT",
        "UNREAD_MESSAGE_REMINDER",
        "PREMIUM_PROMO",
        "SYSTEM",
      ],
      required: true,
    },

    // 📝 UI content
    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    // 🖼️ Avatar / Icon
    image: {
      type: String, // user profile pic OR system icon url
    },

    // 🔗 Deep link / Action
    action: {
      screen: {
        type: String, // chat, match, settings, premium, event
      },
      payload: {
        type: Object, // { matchId, chatId, userId }
      },
    },

    // 👁️ Read status
    // isRead: {
    //   type: Boolean,
    //   default: false,
    //   index: true,
    // },

    // 🚀 Extra metadata
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true, // createdAt used for "2 hrs ago"
  }
);

// NotificationSchema.index({ user: 1, createdAt: -1 });
// NotificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
