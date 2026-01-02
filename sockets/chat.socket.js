// const ChatMessage = require("../modules/matches/chat/chat.message.model");
// const { Match } = require("../modules/matches/swipe/swipe.model");
// const User = require("../modules/auth/auth.model");
// const { sendNotification } = require("../modules/notifications/firebase-admin");
// module.exports = function chatSocket(io,redisClient) {
//   io.on("connection", (socket) => {
//     console.log("✅ SOCKET CONNECTED:", socket.id, "USER:", socket.user._id);
    

//     // --------------------------
//     // 1️⃣ JOIN CHAT ROOM
//     // --------------------------

//     socket.on("join_chat", async ({ matchId  }) => {
//       try {
//         console.log("➡️ join_chat called by:", socket.user._id, "match:", matchId);

//         const userId = socket.user._id;
//         const match = await Match.findById(matchId).lean();
//         if (!match) return console.log("❌ Match not found");

//         // check user belongs to match
//         if (!match.users.some((u) => u.toString() === userId.toString())) {
//           return console.log("❌ User not part of match");
//         }

//         // join socket room
//         const room = `chat:${matchId}`;
//         socket.join(room);
//         // ✅ MARK pending messages as delivered
// await ChatMessage.updateMany(
//   {
//     matchId,
//     receiver: socket.user._id,
//     delivered: false,
//   },
//   {
//     delivered: true,
//     deliveredAt: new Date(),
//   }
// );

// console.log("📦 PENDING MESSAGES DELIVERED for", socket.user._id);

//         console.log(`🎉 USER ${userId} JOINED ROOM`, room);

//         io.to(room).emit("user_joined", { userId, matchId });
//       } catch (err) {
//         console.error("join_chat error:", err);
//       }
//     });
    
// socket.on("messages_read", async ({ matchId }) => {
//   try {
//     const userId = socket.user._id;

//     await ChatMessage.updateMany(
//       {
//         matchId,
//         receiver: userId,
//         read: false,
//       },
//       {
//         read: true,
//         readAt: new Date(),
//       }
//     );

//     // sender ko notify
//     io.to(`chat:${matchId}`).emit("messages_read", {
//       matchId,
//       reader: userId,
//     });

//     console.log("👁️ MESSAGES READ by", userId);
//   } catch (err) {
//     console.error("messages_read error", err);
//   }
// });


// // --------------------------
// // 2️⃣ SEND MESSAGE (FINAL)
// // --------------------------
// socket.on("send_message", async ({ matchId, text }) => {
//   try {
//     const sender = socket.user._id;

//     console.log("➡️ send_message called by:", sender, "match:", matchId);

//     // basic validation
//     if (!matchId || !text || !text.trim()) {
//       return console.log("❌ matchId or text missing");
//     }

//     // 1️⃣ fetch match
//     const match = await Match.findById(matchId).lean();
//     if (!match) {
//       return console.log("❌ Match not found");
//     }

//     // 2️⃣ check sender belongs to match
//     const isParticipant = match.users.some(
//       (u) => u.toString() === sender.toString()
//     );

//     if (!isParticipant) {
//       return console.log("❌ Sender not part of match");
//     }

//     // 3️⃣ find receiver (other user)
//     const receiver = match.users.find(
//       (u) => u.toString() !== sender.toString()
//     );

//     if (!receiver) {
//       return console.log("❌ Receiver not found");
//     }

//     // 4️⃣ save message in DB
//     const msg = await ChatMessage.create({
//       matchId,
//       sender,
//       receiver,
//       text: text.trim(),
//     });

//     console.log("💾 MESSAGE SAVED:", msg._id.toString());

//     // 5️⃣ broadcast to chat room
//     const room = `chat:${matchId}`;
//     io.to(room).emit("new_message", msg);

//     console.log("📡 BROADCASTED to room:", room);

//     // 6️⃣ check if receiver is present in room
//     const socketsInRoom = await io.in(room).fetchSockets();

//     const isReceiverPresent = socketsInRoom.some(
//       (s) => s.user?._id?.toString() === receiver.toString()
//     );

//     // 7️⃣ if receiver is online → mark delivered
//     if (isReceiverPresent) {
//       await ChatMessage.findByIdAndUpdate(msg._id, {
//         delivered: true,
//         deliveredAt: new Date(),
//       });

//       // notify sender
//       socket.emit("message_delivered", {
//         messageId: msg._id,
//       });

//       console.log("✅ MESSAGE DELIVERED:", msg._id.toString());
//     }
//     const isOnline = await redisClient.get(
//   `user:online:${receiver.toString()}`
// );

// if (isOnline) {
//   console.log("🟢 Receiver ONLINE");
// } else {
//   console.log("🔴 Receiver OFFLINE");
// }


//     // 8️⃣ if receiver offline → send push notification
//     if (!isReceiverPresent) {
//       console.log("📨 RECEIVER OFFLINE — sending push");

//       const recipient = await User.findById(receiver).lean();

//       if (recipient?.fcmTokens?.length) {
//         for (let tk of recipient.fcmTokens) {
//           await sendNotification(
//             tk.token,
//             {
//               title: "New Message",
//               body: text,
//             },
//             {
//               type: "NEW_MESSAGE",
//               matchId: matchId.toString(),
//               senderId: sender.toString(),
//             }
//           );
//         }
//       }
//     }

//   } catch (err) {
//     console.error("❌ send_message error:", err);
//   }
// });


//     // --------------------------
//     // 2️⃣ SEND MESSAGE
//     // --------------------------
//     // socket.on("send_message", async (payload) => {
//     //   try {
//     //     const sender = socket.user._id;
//     //     const { matchId, receiver, text } = payload;

//     //     console.log("➡️ send_message by:", sender, "payload:", payload);

//     //     if (!matchId || !receiver) {
//     //       return console.log("❌ matchId/receiver missing");
//     //     }

//     //     // save message
//     //     const msg = await ChatMessage.create({
//     //       matchId,
//     //       sender,
//     //       receiver,
//     //       text: text || "",
//     //     });

//     //     console.log("💾 MESSAGE SAVED:", msg._id);

//     //     // broadcast to room
//     //     const room = `chat:${matchId}`;
//     //     io.to(room).emit("new_message", msg);
//     //     console.log("📡 BROADCASTED to room", room);

//     //     // if receiver NOT inside chat room → send push
//     //     const socketsInRoom = await io.in(room).fetchSockets();
//     //     const isReceiverPresent = socketsInRoom.some(
//     //       (s) => s.user._id.toString() === receiver.toString()
//     //     );
//     //         if (isReceiverPresent) {
//     //   await ChatMessage.findByIdAndUpdate(msg._id, {
//     //     delivered: true,
//     //     deliveredAt: new Date(),
//     //   });

//     //   // sender ko notify
//     //   socket.emit("message_delivered", {
//     //     messageId: msg._id,
//     //   });

//     //   console.log("✅ MESSAGE DELIVERED:", msg._id);
//     // }


//     //     if (!isReceiverPresent) {
//     //       console.log("📨 RECEIVER OFFLINE — Sending push notification...");

//     //       const recipient = await User.findById(receiver).lean();
//     //       if (recipient?.fcmTokens?.length) {
//     //         for (let tk of recipient.fcmTokens) {
//     //           await sendNotification(
//     //             tk.token,
//     //             { title: "New Message", body: text },
//     //             { type: "NEW_MESSAGE", matchId: matchId.toString() }
//     //           );
//     //         }
//     //       }
//     //     }
//     //   } catch (err) {
//     //     console.error("send_message error:", err);
//     //   }
//     // });

//     // --------------------------
//     // 3️⃣ DISCONNECT
//     // --------------------------
//     socket.on("disconnect", async() => {
//         const userId = socket.user._id.toString();
//         await redisClient.sRem(`user:sockets:${userId}`, socket.id);

// // check if any socket left
// const socketsLeft = await redisClient.sCard(`user:sockets:${userId}`);

// if (socketsLeft === 0) {
//   await redisClient.del(`user:online:${userId}`);
//   console.log("🔴 USER OFFLINE:", userId);
// }
//       console.log("🔌 USER DISCONNECTED:", socket.user._id, "socket:", socket.id);
//     });
//   });
// };




const ChatMessage = require("../modules/matches/chat/chat.message.model");
const { Match } = require("../modules/matches/swipe/swipe.model");
// const User = require("../../auth/auth.model");
const notificationService = require("../modules/notifications/notification.service");
// const mongoose = require("mongoose");

module.exports = function chatSocket(io, redisClient) {
  io.on("connection", (socket) => {
    const currentUserId = socket.user._id.toString();
    console.log("✅ SOCKET CONNECTED:", socket.id, "USER:", currentUserId);

    // Online Status Set Karo
    redisClient.set(`user:online:${currentUserId}`, "true");
    redisClient.sAdd(`user:sockets:${currentUserId}`, socket.id);

    // 1️⃣ JOIN CHAT ROOM
    socket.on("join_chat", async ({ matchId }) => {
      try {
        if (!matchId) return;
        const room = `chat:${matchId}`;
        socket.join(room);

        // Mark messages as delivered when joining
        await ChatMessage.updateMany(
          { matchId, receiver: socket.user._id, delivered: false },
          { delivered: true, deliveredAt: new Date() }
        );

        console.log(`🎉 USER ${currentUserId} JOINED ROOM`, room);
        io.to(room).emit("user_joined", { userId: currentUserId, matchId });
      } catch (err) {
        console.error("join_chat error:", err);
      }
    });

    // 2️⃣ SEND MESSAGE
    socket.on("send_message", async ({ matchId, text }) => {
      try {
        if (!matchId || !text || !text.trim()) return;

        // 1. Match check & Find Receiver
        const match = await Match.findById(matchId).lean();
        if (!match) return console.log("❌ Match not found");

        const isParticipant = match.users.some(u => u.toString() === currentUserId);
        if (!isParticipant) return console.log("❌ Not authorized");

        // FIX: Receiver define kar rahe hain yahan
        const receiverId = match.users.find(u => u.toString() !== currentUserId);

        // 2. Save Message
        const msg = await ChatMessage.create({
          matchId,
          sender: currentUserId,
          receiver: receiverId,
          text: text.trim(),
        });

        // 3. Update Match for Latest Message (VVIP for UI)
        await Match.findByIdAndUpdate(matchId, {
          lastMessage: text.trim(),
          lastMessageAt: new Date(),
          lastMessageBy: currentUserId
        });
// The Broadcast
        const room = `chat:${matchId}`;
        io.to(room).emit("new_message", msg);

        // 4. Delivery Status & Push Logic
        const socketsInRoom = await io.in(room).fetchSockets();
        const isReceiverPresent = socketsInRoom.some(s => s.user._id.toString() === receiverId.toString());

        if (isReceiverPresent) {
          await ChatMessage.findByIdAndUpdate(msg._id, { delivered: true, deliveredAt: new Date() });
          socket.emit("message_delivered", { messageId: msg._id });
        } else {
          // Send Push Notification if receiver is not in room
          await notificationService.sendNewMessageNotification(currentUserId, receiverId, text);


  //         const isOnlineSomewhere = await redisClient.get(`user:online:${receiverId.toString()}`);

  // if (isOnlineSomewhere) {
  //   // ✅ Case 2: User online hai par kisi aur screen par hai (e.g. Profile dekh raha hai)
  //   // Hum usey sirf socket emit karenge (Notification pop-up ke liye)
  //   io.to(`user:room:${receiverId}`).emit("new_message_popup", msg);
  //   console.log("🟢 User online somewhere else, socket popup sent");
  // } else {
  //   // ❌ Case 3: User bilkul offline hai (Redis mein key nahi mili)
  //   // Ab hum bhejenge Push Notification (Firebase)
  //   console.log("📨 User is totally offline, sending Firebase Push...");
  //   await notificationService.sendNewMessageNotification(currentUserId, receiverId, text);
  // }
        }

      } catch (err) {
        console.error("❌ send_message error:", err);
      }
    });

    // 3️⃣ MESSAGES READ
    socket.on("messages_read", async ({ matchId }) => {
      try {
        await ChatMessage.updateMany(
          { matchId, receiver: currentUserId, read: false },
          { read: true, readAt: new Date() }
        );
        io.to(`chat:${matchId}`).emit("messages_read", { matchId, reader: currentUserId });
      } catch (err) {
        console.error("messages_read error", err);
      }
    });

    // 4️⃣ DISCONNECT
    socket.on("disconnect", async () => {
      await redisClient.sRem(`user:sockets:${currentUserId}`, socket.id);
      const remainingSockets = await redisClient.sCard(`user:sockets:${currentUserId}`);
      if (remainingSockets === 0) {
        await redisClient.del(`user:online:${currentUserId}`);
      }
      console.log("🔌 DISCONNECTED:", currentUserId);
    });
  });
};
