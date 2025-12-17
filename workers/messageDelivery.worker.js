const { Worker } = require("bullmq");
const ChatMessage = require("../modules/matches/chat/chat.message.model");
const User = require("../modules/auth/auth.model");
const { sendNotification } = require("../modules/notifications/firebase-admin");
const { connection } = require("../queues/bull");
const { client: redis } = require("../config/cache");
const { pub } = require("../sockets/redis.pubsub");
const Notification = require("../modules/notifications/notification.model");

new Worker(
  "message-delivery",
  async (job) => {
    consol.log("message-delivery Job: ", job);
    const { msgId, matchId, receiver } = job.data;
    const msg = await ChatMessage.findById(msgId);
    if (!msg) return;

    console.log("msgId: ", msgId, "matchId: ", matchId, "receiver: ", receiver);

    // Check Redis for receiver's state
    const [sockets, activeRoom] = await Promise.all([
      redis.sMembers(`sockets:${receiver}`),
      redis.get(`active_room:${receiver}`),
    ]);

    console.log("sockets: ", sockets, "activeRoom: ", activeRoom);

    const isOnline = sockets.length > 0;
    const isViewingThisChat = activeRoom === matchId;

    console.log("isOnline: ", isOnline);

    // 🔐 Status update (NO DOWNGRADE)
    if (msg.status === "sent") {
      msg.status = isOnline ? "delivered" : "unread";
      msg.deliveredAt = isOnline ? new Date() : null;
      await msg.save();
    }

    // 🔥 ONLINE → Redis publish (socket server will emit)
    if (isOnline) {
      // 2. Real-time emit via Pub/Sub (Socket.io)
      await pub.publish(
        "chat:deliver",
        JSON.stringify({
          receiver,
          msg,
        })
      );
    }

    // if (!isOnline) {
    //   const user = await User.findById(receiver).lean();
    //   if (user?.fcmTokens?.length) {
    //     for (const tk of user.fcmTokens) {
    //       await sendNotification(
    //         tk.token,
    //         { title: "New Message", body: msg.text },
    //         { matchId }
    //       );
    //     }
    //   }
    // }

    // 🔕 OFFLINE → Push notification → Only send to latest active fcm token
    // Trigger if: User is OFFLINE OR User is ONLINE but in a DIFFERENT ROOM
    if (!isOnline || !isViewingThisChat) {
      const user = await User.findById(receiver).select("fcmTokens").lean();
      const token = user?.fcmTokens?.at(-1);

      if (token) {
        await sendNotification(
          token.token,
          { title: "New Message", body: msg.text || "Sent media" },
          { matchId: matchId.toString(), senderId: msg.sender.toString() }
        );
      }

      // Requirement 3: Save to Notification Model for "Pending Notification Page"
      await Notification.create({
        user: receiver,
        type: "NEW_MESSAGE",
        title: "New Message",
        body: msg.text,
        metadata: { matchId, messageId: msg._id, senderId: msg.sender },
      });
    }
  },
  { connection }
);

console.log("📧 message Delivery worker running...");
