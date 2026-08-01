// modules/notifications/notification.service.js
// eslint-disable-next-line no-unused-vars
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { sendNotificationToMultiple } = require("./firebase-admin");
const User = require("../../modules/auth/auth.model");
const Profile = require("../../modules/profile/profile.model");
const NotificationLog = require("../../modules/Admin/adminNotificationCampaigns/notificationLog.model");
const { NOTIFICATION_TYPES } = require("./notification.enums");
const redis = require("../../config/cache");

class NotificationService {
  // RACE FIX: NEW_MATCH/NEW_MESSAGE/NEW_LIKE/NEW_SUPER_LIKE jobs run through BullMQ with
  // attempts:3 + exponential backoff (see queues/notification.queue.js). If a push call
  // "fails" ambiguously (e.g. network timeout after FCM already accepted it), BullMQ retries
  // the whole job, which would otherwise re-send the exact same push to the same device.
  // This is a short-TTL guard (NX) so a retry of the SAME logical notification within the
  // retry window is skipped, while a genuinely new notification later still goes through.
  async _isDuplicateSend(dedupeKey) {
    if (!redis || !redis.redisClient || !redis.redisClient.isOpen) return false; // fail-open if redis is down
    try {
      const acquired = await redis.redisClient.set(dedupeKey, "1", { NX: true, EX: 60 });
      return !acquired;
    } catch (err) {
      console.error("Notification dedupe check failed:", err.message);
      return false; // fail-open — never block a real notification because of a redis hiccup
    }
  }

  async _executePush(userId, tokensObj, notification, data) {
    if (!tokensObj || tokensObj.length === 0) return;

    // Map `[{token, deviceId}]` to `['actual_token_string']`
    const tokens = tokensObj.map(t => (typeof t === 'object' && t.token) ? t.token : t).filter(Boolean);
    if (tokens.length === 0) return;

    // 🎯 CTA (Call To Action) Logic
    // If no CTA is provided, fallback to NAVIGATE_HOME as requested
    if (!data.cta) {
      data.cta = JSON.stringify({ action: "NAVIGATE_HOME" });
    }

    const result = await sendNotificationToMultiple(tokens, notification, data);

    if (result.failedTokens && result.failedTokens.length > 0) {
      console.log(
        `Removing ${result.failedTokens.length} dead tokens for user ${userId}`,
      );
      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { token: { $in: result.failedTokens } } } },
      );
    }
    return result;
  }
  async sendNewMatchNotification(userId1, userId2) {
    try {
      // Get users and their profiles
      const [users, profiles] = await Promise.all([
        User.find({ _id: { $in: [userId1, userId2] } }).select("fcmTokens notificationSettings"),
        Profile.find({ userId: { $in: [userId1, userId2] } }).select("userId nickname")
      ]);

      const user1 = users.find((u) => u._id.toString() === userId1.toString());
      const user2 = users.find((u) => u._id.toString() === userId2.toString());
      
      const profile1 = profiles.find((p) => p.userId.toString() === userId1.toString());
      const profile2 = profiles.find((p) => p.userId.toString() === userId2.toString());

      const name1 = profile1?.nickname || "Someone";
      const name2 = profile2?.nickname || "Someone";

      if (!user1 || !user2) {
        throw new Error("One or both users not found");
      }
      // &&
      //   user1.notificationSettings?.push !== false
      // Send notification to user1 (Commented out because user1 is currently swiping and sees the match screen)
      /*
      if (
        user1.fcmTokens &&
        user1.fcmTokens.length > 0 &&
        user1.notificationSettings?.matches !== false &&
        user1.notificationSettings?.push !== false
      ) {
        await this._executePush(
          user1._id,
          user1.fcmTokens,
          {
            title: "It's a match! 🔥",
            body: `You and ${name2} have liked each other. Start a conversation now!`,
          },
          {
            type: NOTIFICATION_TYPES.NEW_MATCH,
            matchId: userId2.toString(),
            cta: JSON.stringify({ action: "OPEN_MATCHES" }),
          },
        );
      }
      */

      // Send notification to user2
      if (
        user2.fcmTokens &&
        user2.fcmTokens.length > 0 &&
        user2.notificationSettings?.matches !== false &&
        user2.notificationSettings?.push !== false &&
        !(await this._isDuplicateSend(`notif:dedupe:NEW_MATCH:${userId2}:${userId1}`))
      ) {
        await this._executePush(
          user2._id,
          user2.fcmTokens,
          {
            title: "It's a match! 🔥",
            body: `You and ${name1} are both Keen! Start a conversation now!`,
          },
          {
            type: NOTIFICATION_TYPES.NEW_MATCH,
            matchId: userId1.toString(),
            cta: JSON.stringify({ action: "OPEN_MATCHES" }),
          },
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error in sendNewMatchNotification:", error);
      throw error;
    }
  }

  // Send a new message notification
  async sendNewMessageNotification(senderId, receiverId, messageText, matchId, messageId) {
    try {
      const [senderProfile, receiver] = await Promise.all([
        Profile.findOne({ userId: senderId }).select("nickname"),
        User.findById(receiverId).select("fcmTokens notificationSettings"),
      ]);

      if (
        receiver.notificationSettings?.push === false ||
        receiver.notificationSettings?.messages === false
      ) {
        return;
      }
      if (!receiver?.fcmTokens?.length) return;

      // Only messageId is precise enough for dedupe (senderId+receiverId repeats every message).
      // If it's ever missing, skip dedupe rather than risk wrongly suppressing a real message.
      if (messageId && (await this._isDuplicateSend(`notif:dedupe:NEW_MESSAGE:${messageId}`))) {
        return;
      }

      const senderName = senderProfile?.nickname || "Someone";

      const data = {
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        senderId: senderId.toString(),
        cta: JSON.stringify({ action: "OPEN_CHAT" }),
      };

      // Include matchId for deep-linking to exact conversation
      if (matchId) data.matchId = matchId.toString();
      if (messageId) data.messageId = messageId.toString();

      await this._executePush(
        receiverId,
        receiver.fcmTokens,
        {
          title: `New message from ${senderName}`,
          body:
            messageText.length > 100
              ? `${messageText.substring(0, 100)}...`
              : messageText,
        },
        data,
      );
    } catch (error) {
      console.error("Error in sendNewMessageNotification:", error);
      throw error;
    }
  }

  // Send a like notification
  async sendLikeNotification(senderId, receiverId) {
    try {
      const [senderProfile, receiver] = await Promise.all([
        Profile.findOne({ userId: senderId }).select("nickname photos"),
        User.findById(receiverId).select("fcmTokens notificationSettings"),
      ]);

      // Check if receiver wants to receive like notifications
      if (
        receiver.notificationSettings?.push === false ||
        receiver.notificationSettings?.likes === false
      ) {
        console.log(`🚫 Notification skipped for user ${receiverId}: Disabled likes/push settings.`);
        return;
      }

      if (!receiver?.fcmTokens?.length) {
        console.log(`⚠️ Notification skipped for user ${receiverId}: No FCM tokens found.`);
        return;
      }

      if (await this._isDuplicateSend(`notif:dedupe:NEW_LIKE:${receiverId}:${senderId}`)) {
        return;
      }

      const senderPhoto = senderProfile?.photos?.[0]?.url || null;
      const senderName = senderProfile?.nickname || "Someone";

      await this._executePush(
        receiverId,
        receiver.fcmTokens,
        {
          title: "Someone is Keen on you! 💜",
          body: `${senderName} is Keen on your profile!`,
          imageUrl: senderPhoto,
        },
        {
          type: NOTIFICATION_TYPES.NEW_LIKE,
          senderId: senderId.toString(),
          cta: JSON.stringify({ action: "OPEN_LIKES" }),
        },
      );
    } catch (error) {
      console.error("Error in sendLikeNotification:", error);
      throw error;
    }
  }

  // Send a super-like notification (distinct from regular like)
  async sendSuperLikeNotification(senderId, receiverId) {
    try {
      const [senderProfile, receiver] = await Promise.all([
        Profile.findOne({ userId: senderId }).select("nickname photos"),
        User.findById(receiverId).select("fcmTokens notificationSettings"),
      ]);

      // Check if receiver wants to receive like notifications
      if (
        receiver.notificationSettings?.push === false ||
        receiver.notificationSettings?.likes === false
      ) {
        console.log(`🚫 Super-like notification skipped for user ${receiverId}: Disabled likes/push settings.`);
        return;
      }

      if (!receiver?.fcmTokens?.length) {
        console.log(`⚠️ Super-like notification skipped for user ${receiverId}: No FCM tokens found.`);
        return;
      }

      if (await this._isDuplicateSend(`notif:dedupe:NEW_SUPER_LIKE:${receiverId}:${senderId}`)) {
        return;
      }

      const senderPhoto = senderProfile?.photos?.[0]?.url || null;
      const senderName = senderProfile?.nickname || "Someone";

      await this._executePush(
        receiverId,
        receiver.fcmTokens,
        {
          title: "You got a Super Keen! ⭐",
          body: `${senderName} sent you a Super Keen!`,
          imageUrl: senderPhoto,
        },
        {
          type: NOTIFICATION_TYPES.NEW_SUPER_LIKE,
          senderId: senderId.toString(),
          isSuperLike: "true",
          cta: JSON.stringify({ action: "OPEN_SUPER_LIKES" }),
        },
      );
    } catch (error) {
      console.error("Error in sendSuperLikeNotification:", error);
      throw error;
    }
  }

  async sendGiveawayWinnerNotification(userId, prizeTitle) {
    try {
      const user = await User.findById(userId).select(
        "fcmTokens notificationSettings",
      );

      // if (!user || !user.fcmTokens.length) return;
      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        console.log("⚠️ No FCM tokens found for user:", userId);
        return;
      }

      if (user.notificationSettings?.push === false) {
        return;
      }
      await this._executePush(
        userId,
        user.fcmTokens,
        {
          title: "🎉 Congratulations!",
          body: `You won today's giveaway: ${prizeTitle}`,
        },
        {
          type: NOTIFICATION_TYPES.GIVEAWAY_WINNER,
          cta: JSON.stringify({ action: "OPEN_REWARDS" }),
        },
      );

      console.log("Push notification sent to winner");
    } catch (error) {
      console.error("Giveaway notification error:", error);
    }
  }

  async sendPrizeDeliveredNotification(userId) {
    try {
      const user = await User.findById(userId).select(
        "fcmTokens notificationSettings",
      );

      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        return;
      }

      if (user.notificationSettings?.push === false) {
        return;
      }

      await this._executePush(
        userId,
        user.fcmTokens,
        {
          title: "🎉 Prize Delivered!",
          body: "Your giveaway prize has been successfully delivered.",
        },
        {
          type: NOTIFICATION_TYPES.PRIZE_DELIVERED,
          cta: JSON.stringify({ action: "OPEN_REWARDS" }),
        },
      );
    } catch (error) {
      console.error("Prize delivered notification error:", error);
    }
  }

  async sendAdminNotification({
    userId,
    title,
    message,
    data = {},
    respectUserSettings = true,
  }) {
    // console.log("Start sending push");
    try {
      const user = await User.findById(userId).select(
        "fcmTokens notificationSettings",
      );
      // console.log(userId, "userId in sendAdminNotification");
      if (!user) return;

      if (respectUserSettings && user.notificationSettings?.push === false) {
        return;
      }

      if (!user.fcmTokens || user.fcmTokens.length === 0) {
        return;
      }
      // console.log("Sending admin notification", user);

      await this._executePush(
        userId,
        user.fcmTokens,
        {
          title,
          body: message,
        },
        {
          type: data.type || NOTIFICATION_TYPES.ADMIN_NOTIFICATION,
          campaignId: data.campaignId?.toString(),
          cta: data.cta ? (typeof data.cta === "string" ? data.cta : JSON.stringify(data.cta)) : "",
          ...data.extra,
        },
      );

      await NotificationLog.create({
        userId,
        campaignId: data.campaignId || null,
        title,
        message,
        type: data.type,
        cta: data.cta,
        status: "sent",
      });

      return { success: true };
    } catch (error) {
      await NotificationLog.create({
        userId,
        campaignId: data.campaignId || null,
        title,
        message,
        type: data.type,
        status: "failed",
        error: error.message,
      });
      throw error;
    }
  }
}
module.exports = new NotificationService();