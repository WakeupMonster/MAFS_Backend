// modules/notifications/notification.service.js
// eslint-disable-next-line no-unused-vars
const { sendNotification, sendNotificationToMultiple } = require('./firebase-admin');
const User = require('../../modules/auth/auth.model'); 

class NotificationService {
  // Send a new match notification to both users

  async _executePush(userId, tokens, notification, data) {
        if (!tokens || tokens.length === 0) return;

        const result = await sendNotificationToMultiple(tokens, notification, data);

        // DEAD TOKEN CLEANUP
        if (result.failedTokens && result.failedTokens.length > 0) {
            console.log(`🧹 Removing ${result.failedTokens.length} dead tokens for user ${userId}`);
            await User.updateOne(
                { _id: userId },
                { $pull: { fcmTokens: { $in: result.failedTokens } } }
            );
        }
        return result;
    }
  async sendNewMatchNotification(userId1, userId2) {
    try {
      // Get both users' FCM tokens
      const users = await User.find({
        _id: { $in: [userId1, userId2] }
      }).select('fcmTokens firstName notificationSettings');

      const user1 = users.find(u => u._id.toString() === userId1.toString());
      const user2 = users.find(u => u._id.toString() === userId2.toString());

      if (!user1 || !user2) {
        throw new Error('One or both users not found');
      }
// &&
//   user1.notificationSettings?.push !== false
      // Send notification to user1
      if (user1.fcmTokens && user1.fcmTokens.length > 0 && user1.notificationSettings?.matches !== false  &&
  user1.notificationSettings?.push !== false ) {
        await sendNotificationToMultiple(
          user1.fcmTokens,
          {
            title: "It's a match! 🔥",
            body: `You and ${user2.firstName} have liked each other. Start a conversation now!`
          },
          {
            type: 'NEW_MATCH',
            matchId: userId2.toString()
          }
        );
      }

      // Send notification to user2
      if (user2.fcmTokens && user2.fcmTokens.length > 0 &&
  user2.notificationSettings?.matches !== false  &&
  user1.notificationSettings?.push !== false) {
        await sendNotificationToMultiple(
          user2.fcmTokens,
          {
            title: "It's a match! 🔥",
            body: `You and ${user1.firstName} have liked each other. Start a conversation now!`
          },
          {
            type: 'NEW_MATCH',
            matchId: userId1.toString()
          }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendNewMatchNotification:', error);
      throw error;
    }
  }

  // Send a new message notification
  async sendNewMessageNotification(senderId, receiverId, messageText) {
    try {
      const [sender, receiver] = await Promise.all([
        User.findById(senderId).select('firstName'),
        User.findById(receiverId).select('fcmTokens notificationSettings')
      ]);

      if (
  receiver.notificationSettings?.push === false ||
  receiver.notificationSettings?.messages === false
) {
  return;
}


      if (!receiver?.fcmTokens?.length) return;

      await sendNotificationToMultiple(
        receiver.fcmTokens,
        {
          title: `New message from ${sender.firstName}`,
          body: messageText.length > 100 
            ? `${messageText.substring(0, 100)}...` 
            : messageText
        },
        {
          type: 'NEW_MESSAGE',
          senderId: senderId.toString(),
          conversationId: [senderId, receiverId].sort().join('_')
        }
      );
    } catch (error) {
      console.error('Error in sendNewMessageNotification:', error);
      throw error;
    }
  }

  // Send a like notification
  async sendLikeNotification(senderId, receiverId) {
    try {
      const [sender, receiver] = await Promise.all([
        User.findById(senderId).select('firstName photos'),
        User.findById(receiverId).select('fcmTokens notificationSettings')
      ]);

      // Check if receiver wants to receive like notifications
      if (receiver.notificationSettings?.push === false ||
  receiver.notificationSettings?.likes === false) {
        return;
      }

      if (!receiver?.fcmTokens?.length) return;

      const senderPhoto = sender.photos?.[0]?.url || null;

      await sendNotificationToMultiple(
        receiver.fcmTokens,
        {
          title: "New like! 💖",
          body: `${sender.firstName} liked your profile`,
          imageUrl: senderPhoto
        },
        {
          type: 'NEW_LIKE',
          senderId: senderId.toString()
        }
      );
    } catch (error) {
      console.error('Error in sendLikeNotification:', error);
      throw error;
    }
  }

  // Add more notification types as needed...

  async sendGiveawayWinnerNotification(userId, prizeTitle) {
  try {
    const user = await User.findById(userId).select("fcmTokens notificationSettings");

    // if (!user || !user.fcmTokens.length) return;
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log("⚠️ No FCM tokens found for user:", userId);
      return;
    }

    if (
  user.notificationSettings?.push === false
) {
  return;
}



    await sendNotificationToMultiple(
      user.fcmTokens,
      {
        title: "🎉 Congratulations!",
        body: `You won today's giveaway: ${prizeTitle}`
      },
      {
        type: "GIVEAWAY_WINNER"
      }
    );

    console.log("Push notification sent to winner")
  } catch (error) {
    console.error("Giveaway notification error:", error);
  }
}


/**
 * ==========================================
 * 🎁 PRIZE DELIVERED NOTIFICATION
 * ==========================================
 * 👉 Jab admin prize deliver mark kare
 */
async sendPrizeDeliveredNotification(userId) {
  try {
    const user = await User.findById(userId).select("fcmTokens notificationSettings");

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return;
    }

    if (user.notificationSettings?.push === false) {
  return;
}


    await sendNotificationToMultiple(
      user.fcmTokens,
      {
        title: "🎉 Prize Delivered!",
        body: "Your giveaway prize has been successfully delivered."
      },
      {
        type: "PRIZE_DELIVERED"
      }
    );

  } catch (error) {
    console.error(
      "Prize delivered notification error:",
      error
    );
  }
}

}


// 🎁 Giveaway winner notification


module.exports = new NotificationService();