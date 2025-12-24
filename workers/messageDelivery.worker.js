const { Worker } = require("bullmq");
const ChatMessage = require("../modules/matches/chat/chat.message.model");
const User = require("../modules/auth/auth.model");
const { sendNotification } = require("../modules/notifications/firebase-admin");
const { connection } = require("../queues/bull");
const { client: redis } = require("../config/cache");

new Worker(
  "message-delivery",
  async (job) => {
    const { msgId, matchId, receiver } = job.data;

    const msg = await ChatMessage.findById(msgId);
    if (!msg) return;

    const sockets = await redis.sMembers(`sockets:${receiver}`);
    const isOnline = sockets.length > 0;

    // receive = 123
    // socket : 123

    // 🔐 Status update (NO DOWNGRADE)
    if (msg.status === "sent") {
      if (isOnline) {
        msg.status = "delivered";
        msg.deliveredAt = new Date();
      } else {
        msg.status = "unread";
      }
      await msg.save();
    }

    // 📡 Emit only if receiver online
    if (isOnline) {
      for (const sid of sockets) {
        // ques. asked ❌
        // ⚠️⚠️ global.io use kre ya nhi, prblm production me ati hn local me nhi, solution-> sir se puchana hn?
        global.io.to(sid).emit("new_message", msg);
      }
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

    // Only send to latest active fcm token
    if (!isOnline) {
      const user = await User.findById(receiver).lean();
      const token = user?.fcmTokens?.at(-1);
  
      if (token) {
        await sendNotification(
          token.token,
          { title: "New Message", body: msg.text },
          { matchId }
        );
      }
    }
  },
  { connection }
);

console.log("📧 message Delivery worker running...");
