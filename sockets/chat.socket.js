// // const ChatMessage = require("../modules/matches/chat/chat.message.model");
// // const { Match } = require("../modules/matches/swipe/swipe.model");
// // const User = require("../modules/auth/auth.model");
// // const { sendNotification } = require("../modules/notifications/firebase-admin");
// // module.exports = function chatSocket(io,redisClient) {
// //   io.on("connection", (socket) => {
// //     console.log("✅ SOCKET CONNECTED:", socket.id, "USER:", socket.user._id);


// //     // --------------------------
// //     // 1️⃣ JOIN CHAT ROOM
// //     // --------------------------

// //     socket.on("join_chat", async ({ matchId  }) => {
// //       try {
// //         console.log("➡️ join_chat called by:", socket.user._id, "match:", matchId);

// //         const userId = socket.user._id;
// //         const match = await Match.findById(matchId).lean();
// //         if (!match) return console.log("❌ Match not found");

// //         // check user belongs to match
// //         if (!match.users.some((u) => u.toString() === userId.toString())) {
// //           return console.log("❌ User not part of match");
// //         }

// //         // join socket room
// //         const room = `chat:${matchId}`;
// //         socket.join(room);
// //         // ✅ MARK pending messages as delivered
// // await ChatMessage.updateMany(
// //   {
// //     matchId,
// //     receiver: socket.user._id,
// //     delivered: false,
// //   },
// //   {
// //     delivered: true,
// //     deliveredAt: new Date(),
// //   }
// // );

// // console.log("📦 PENDING MESSAGES DELIVERED for", socket.user._id);

// //         console.log(`🎉 USER ${userId} JOINED ROOM`, room);

// //         io.to(room).emit("user_joined", { userId, matchId });
// //       } catch (err) {
// //         console.error("join_chat error:", err);
// //       }
// //     });

// // socket.on("messages_read", async ({ matchId }) => {
// //   try {
// //     const userId = socket.user._id;

// //     await ChatMessage.updateMany(
// //       {
// //         matchId,
// //         receiver: userId,
// //         read: false,
// //       },
// //       {
// //         read: true,
// //         readAt: new Date(),
// //       }
// //     );

// //     // sender ko notify
// //     io.to(`chat:${matchId}`).emit("messages_read", {
// //       matchId,
// //       reader: userId,
// //     });

// //     console.log("👁️ MESSAGES READ by", userId);
// //   } catch (err) {
// //     console.error("messages_read error", err);
// //   }
// // });


// // // --------------------------
// // // 2️⃣ SEND MESSAGE (FINAL)
// // // --------------------------
// // socket.on("send_message", async ({ matchId, text }) => {
// //   try {
// //     const sender = socket.user._id;

// //     console.log("➡️ send_message called by:", sender, "match:", matchId);

// //     // basic validation
// //     if (!matchId || !text || !text.trim()) {
// //       return console.log("❌ matchId or text missing");
// //     }

// //     // 1️⃣ fetch match
// //     const match = await Match.findById(matchId).lean();
// //     if (!match) {
// //       return console.log("❌ Match not found");
// //     }

// //     // 2️⃣ check sender belongs to match
// //     const isParticipant = match.users.some(
// //       (u) => u.toString() === sender.toString()
// //     );

// //     if (!isParticipant) {
// //       return console.log("❌ Sender not part of match");
// //     }

// //     // 3️⃣ find receiver (other user)
// //     const receiver = match.users.find(
// //       (u) => u.toString() !== sender.toString()
// //     );

// //     if (!receiver) {
// //       return console.log("❌ Receiver not found");
// //     }

// //     // 4️⃣ save message in DB
// //     const msg = await ChatMessage.create({
// //       matchId,
// //       sender,
// //       receiver,
// //       text: text.trim(),
// //     });

// //     console.log("💾 MESSAGE SAVED:", msg._id.toString());

// //     // 5️⃣ broadcast to chat room
// //     const room = `chat:${matchId}`;
// //     io.to(room).emit("new_message", msg);

// //     console.log("📡 BROADCASTED to room:", room);

// //     // 6️⃣ check if receiver is present in room
// //     const socketsInRoom = await io.in(room).fetchSockets();

// //     const isReceiverPresent = socketsInRoom.some(
// //       (s) => s.user?._id?.toString() === receiver.toString()
// //     );

// //     // 7️⃣ if receiver is online → mark delivered
// //     if (isReceiverPresent) {
// //       await ChatMessage.findByIdAndUpdate(msg._id, {
// //         delivered: true,
// //         deliveredAt: new Date(),
// //       });

// //       // notify sender
// //       socket.emit("message_delivered", {
// //         messageId: msg._id,
// //       });

// //       console.log("✅ MESSAGE DELIVERED:", msg._id.toString());
// //     }
// //     const isOnline = await redisClient.get(
// //   `user:online:${receiver.toString()}`
// // );

// // if (isOnline) {
// //   console.log("🟢 Receiver ONLINE");
// // } else {
// //   console.log("🔴 Receiver OFFLINE");
// // }


// //     // 8️⃣ if receiver offline → send push notification
// //     if (!isReceiverPresent) {
// //       console.log("📨 RECEIVER OFFLINE — sending push");

// //       const recipient = await User.findById(receiver).lean();

// //       if (recipient?.fcmTokens?.length) {
// //         for (let tk of recipient.fcmTokens) {
// //           await sendNotification(
// //             tk.token,
// //             {
// //               title: "New Message",
// //               body: text,
// //             },
// //             {
// //               type: "NEW_MESSAGE",
// //               matchId: matchId.toString(),
// //               senderId: sender.toString(),
// //             }
// //           );
// //         }
// //       }
// //     }

// //   } catch (err) {
// //     console.error("❌ send_message error:", err);
// //   }
// // });


// //     // --------------------------
// //     // 2️⃣ SEND MESSAGE
// //     // --------------------------
// //     // socket.on("send_message", async (payload) => {
// //     //   try {
// //     //     const sender = socket.user._id;
// //     //     const { matchId, receiver, text } = payload;

// //     //     console.log("➡️ send_message by:", sender, "payload:", payload);

// //     //     if (!matchId || !receiver) {
// //     //       return console.log("❌ matchId/receiver missing");
// //     //     }

// //     //     // save message
// //     //     const msg = await ChatMessage.create({
// //     //       matchId,
// //     //       sender,
// //     //       receiver,
// //     //       text: text || "",
// //     //     });

// //     //     console.log("💾 MESSAGE SAVED:", msg._id);

// //     //     // broadcast to room
// //     //     const room = `chat:${matchId}`;
// //     //     io.to(room).emit("new_message", msg);
// //     //     console.log("📡 BROADCASTED to room", room);

// //     //     // if receiver NOT inside chat room → send push
// //     //     const socketsInRoom = await io.in(room).fetchSockets();
// //     //     const isReceiverPresent = socketsInRoom.some(
// //     //       (s) => s.user._id.toString() === receiver.toString()
// //     //     );
// //     //         if (isReceiverPresent) {
// //     //   await ChatMessage.findByIdAndUpdate(msg._id, {
// //     //     delivered: true,
// //     //     deliveredAt: new Date(),
// //     //   });

// //     //   // sender ko notify
// //     //   socket.emit("message_delivered", {
// //     //     messageId: msg._id,
// //     //   });

// //     //   console.log("✅ MESSAGE DELIVERED:", msg._id);
// //     // }


// //     //     if (!isReceiverPresent) {
// //     //       console.log("📨 RECEIVER OFFLINE — Sending push notification...");

// //     //       const recipient = await User.findById(receiver).lean();
// //     //       if (recipient?.fcmTokens?.length) {
// //     //         for (let tk of recipient.fcmTokens) {
// //     //           await sendNotification(
// //     //             tk.token,
// //     //             { title: "New Message", body: text },
// //     //             { type: "NEW_MESSAGE", matchId: matchId.toString() }
// //     //           );
// //     //         }
// //     //       }
// //     //     }
// //     //   } catch (err) {
// //     //     console.error("send_message error:", err);
// //     //   }
// //     // });

// //     // --------------------------
// //     // 3️⃣ DISCONNECT
// //     // --------------------------
// //     socket.on("disconnect", async() => {
// //         const userId = socket.user._id.toString();
// //         await redisClient.sRem(`user:sockets:${userId}`, socket.id);

// // // check if any socket left
// // const socketsLeft = await redisClient.sCard(`user:sockets:${userId}`);

// // if (socketsLeft === 0) {
// //   await redisClient.del(`user:online:${userId}`);
// //   console.log("🔴 USER OFFLINE:", userId);
// // }
// //       console.log("🔌 USER DISCONNECTED:", socket.user._id, "socket:", socket.id);
// //     });
// //   });
// // };





// const ChatMessage = require("../modules/matches/chat/chat.message.model");
// const { Match } = require("../modules/matches/swipe/swipe.model");
// // const User = require("../../auth/auth.model");
// const notificationService = require("../modules/notifications/notification.service");
// // const mongoose = require("mongoose");

// module.exports = function chatSocket(io, redisClient) {
//   io.on("connection", (socket) => {
//     const currentUserId = socket.user._id.toString();
//     console.log("✅ SOCKET CONNECTED:", socket.id, "USER:", currentUserId);

//     // Online Status Set Karo
//     redisClient.set(`user:online:${currentUserId}`, "true");
//     redisClient.sAdd(`user:sockets:${currentUserId}`, socket.id);

//     // 1️⃣ JOIN CHAT ROOM
//     socket.on("join_chat", async ({ matchId }) => {
//       try {
//         if (!matchId) return;
//         const room = `chat:${matchId}`;
//         socket.join(room);

//         // Mark messages as delivered when joining
//         await ChatMessage.updateMany(
//           { matchId, receiver: socket.user._id, delivered: false },
//           { delivered: true, deliveredAt: new Date() }
//         );

//         console.log(`🎉 USER ${currentUserId} JOINED ROOM`, room);
//         io.to(room).emit("user_joined", { userId: currentUserId, matchId });
//       } catch (err) {
//         console.error("join_chat error:", err);
//       }
//     });

//     // 2️⃣ SEND MESSAGE
//     socket.on("send_message", async ({ matchId, text }) => {
//       try {
//         if (!matchId || !text || !text.trim()) return;

//         // 1. Match check & Find Receiver
//         const match = await Match.findById(matchId).lean();
//         if (!match) return console.log("❌ Match not found");

//         const isParticipant = match.users.some(u => u.toString() === currentUserId);
//         if (!isParticipant) return console.log("❌ Not authorized");

//         // FIX: Receiver define kar rahe hain yahan
//         const receiverId = match.users.find(u => u.toString() !== currentUserId);

//         // 2. Save Message
//         const msg = await ChatMessage.create({
//           matchId,
//           sender: currentUserId,
//           receiver: receiverId,
//           text: text.trim(),
//         });

//         // 3. Update Match for Latest Message (VVIP for UI)
//         await Match.findByIdAndUpdate(matchId, {
//           lastMessage: text.trim(),
//           lastMessageAt: new Date(),
//           lastMessageBy: currentUserId
//         });
// // The Broadcast
//         const room = `chat:${matchId}`;
//         io.to(room).emit("new_message", msg);

//         // 4. Delivery Status & Push Logic
//         const socketsInRoom = await io.in(room).fetchSockets();
//         const isReceiverPresent = socketsInRoom.some(s => s.user._id.toString() === receiverId.toString());

//         if (isReceiverPresent) {
//           await ChatMessage.findByIdAndUpdate(msg._id, { delivered: true, deliveredAt: new Date() });
//           socket.emit("message_delivered", { messageId: msg._id });
//         } else {
//           // Send Push Notification if receiver is not in room
//           await notificationService.sendNewMessageNotification(currentUserId, receiverId, text);


//   //         const isOnlineSomewhere = await redisClient.get(`user:online:${receiverId.toString()}`);

//   // if (isOnlineSomewhere) {
//   //   // ✅ Case 2: User online hai par kisi aur screen par hai (e.g. Profile dekh raha hai)
//   //   // Hum usey sirf socket emit karenge (Notification pop-up ke liye)
//   //   io.to(`user:room:${receiverId}`).emit("new_message_popup", msg);
//   //   console.log("🟢 User online somewhere else, socket popup sent");
//   // } else {
//   //   // ❌ Case 3: User bilkul offline hai (Redis mein key nahi mili)
//   //   // Ab hum bhejenge Push Notification (Firebase)
//   //   console.log("📨 User is totally offline, sending Firebase Push...");
//   //   await notificationService.sendNewMessageNotification(currentUserId, receiverId, text);
//   // }
//         }

//       } catch (err) {
//         console.error("❌ send_message error:", err);
//       }
//     });

//     // 3️⃣ MESSAGES READ
//     socket.on("messages_read", async ({ matchId }) => {
//       try {
//         await ChatMessage.updateMany(
//           { matchId, receiver: currentUserId, read: false },
//           { read: true, readAt: new Date() }
//         );
//         io.to(`chat:${matchId}`).emit("messages_read", { matchId, reader: currentUserId });
//       } catch (err) {
//         console.error("messages_read error", err);
//       }
//     });

//     // 4️⃣ DISCONNECT
//     socket.on("disconnect", async () => {
//       await redisClient.sRem(`user:sockets:${currentUserId}`, socket.id);
//       const remainingSockets = await redisClient.sCard(`user:sockets:${currentUserId}`);
//       if (remainingSockets === 0) {
//         await redisClient.del(`user:online:${currentUserId}`);
//       }
//       console.log("🔌 DISCONNECTED:", currentUserId);
//     });
//   });
// };




const ChatMessage = require("../modules/matches/chat/chat.message.model");
const { Match } = require("../modules/matches/swipe/swipe.model");
const notificationService = require("../modules/notifications/notification.service");
const { isBlocked } = require("../modules/profile/block.service")
module.exports = function chatSocket(io, redisClient) {
  io.on("connection", async (socket) => {
    const currentUserId = socket.user._id.toString();

    console.log("✅ SOCKET CONNECTED:", socket.id, "USER:", currentUserId);

    /* ------------------------------------------------------------------ */
    /* 🔹 USER LEVEL ROOM (VERY IMPORTANT) */
    /* ------------------------------------------------------------------ */
    socket.join(`user:${currentUserId}`);

    await redisClient.set(`user:online:${currentUserId}`, "true");
    await redisClient.sAdd(`user:sockets:${currentUserId}`, socket.id);

    /* ------------------------------------------------------------------ */
    /* 1️⃣ JOIN CHAT ROOM */
    /* ------------------------------------------------------------------ */
    socket.on("join_chat", async ({ matchId }) => {
      try {
        if (!matchId) return;

        const match = await Match.findById(matchId).lean();
        if (!match) return;

        const otherUserId = match.users.find(
          (u) => u.toString() !== currentUserId
        );

        const blocked = await isBlocked(currentUserId, otherUserId);
        if (blocked) {
          return
        }

        const room = `chat:${matchId}`;
        socket.join(room);

        // Mark pending messages as DELIVERED
        await ChatMessage.updateMany(
          {
            matchId,
            receiver: currentUserId,
            status: "SENT"
          },
          {
            status: "DELIVERED",
            deliveredAt: new Date()
          }
        );

        console.log(`🎉 USER ${currentUserId} JOINED ROOM`, room);
      } catch (err) {
        console.error("❌ join_chat error:", err);
      }
    });

    /* ------------------------------------------------------------------ */
    /* 2️⃣ SEND MESSAGE */
    /* ------------------------------------------------------------------ */
    socket.on("send_message", async ({ matchId, text, clientMessageId }) => {
      try {
        if (!matchId || !text?.trim()) return;

        /* 1️⃣ Match validation */
        const match = await Match.findById(matchId).lean();
        if (!match) return;

        const isParticipant = match.users.some(
          (u) => u.toString() === currentUserId
        );
        if (!isParticipant) return;

        const receiverId = match.users.find(
          (u) => u.toString() !== currentUserId
        );

        const blocked = await isBlocked(currentUserId, receiverId);
        if (blocked) {
          return; 
        }


        /* 2️⃣ Save message (DB = SOURCE OF TRUTH) */
        const msg = await ChatMessage.create({
          matchId,
          sender: currentUserId,
          receiver: receiverId,
          text: text.trim(),
          status: "SENT",
          clientMessageId
        });

        /* 3️⃣ Update conversation metadata (CHAT LIST ORDER) */
        await Match.findByIdAndUpdate(matchId, {
          lastMessage: msg.text,
          lastMessageAt: msg.createdAt,
          lastMessageBy: currentUserId
        });

        /* 4️⃣ Emit message to chat room */
        io.to(`chat:${matchId}`).emit("new_message", msg);

        /* 5️⃣ 🔥 CHAT LIST TOP REORDER EVENT (USER LEVEL) */
        io.to(`user:${receiverId}`).emit("chat_list_update", {
          matchId,
          lastMessage: msg.text,
          lastMessageAt: msg.createdAt,
          from: currentUserId
        });

        /* 6️⃣ DELIVERY CHECK (NO fetchSockets ❌) */
        const receiverOnline = await redisClient.exists(
          `user:online:${receiverId}`
        );

        if (receiverOnline) {
          await ChatMessage.findByIdAndUpdate(msg._id, {
            status: "DELIVERED",
            deliveredAt: new Date()
          });

          socket.emit("message_delivered", {
            messageId: msg._id,
            matchId
          });
        }

        /* 7️⃣ BACKGROUND WORK (WORKER) */
        await notificationService.add("new_message", {
          senderId: currentUserId,
          receiverId,
          matchId,
          messageId: msg._id,
          text: msg.text
        });
      } catch (err) {
        console.error("❌ send_message error:", err);
      }
    });


    /* ------------------------------------------------------------------ */
    /* 3️⃣ MESSAGE READ */
    /* ------------------------------------------------------------------ */
    socket.on("messages_read", async ({ matchId }) => {
      try {
        await ChatMessage.updateMany(
          {
            matchId,
            receiver: currentUserId,
            status: { $ne: "READ" }
          },
          {
            status: "READ",
            // read : "true",
            readAt: new Date()
          }
        );

        io.to(`chat:${matchId}`).emit("messages_read", {
          matchId,
          reader: currentUserId
        });
      } catch (err) {
        console.error("❌ messages_read error:", err);
      }
    });

    socket.on("typing", ({ matchId, isTyping }) => {
      if (!matchId) return;

      const room = `chat:${matchId}`;

      // sender ko chhod ke sabko bhejo
      socket.to(room).emit("user_typing", {
        userId: socket.user._id.toString(),
        isTyping
      });
    });

    /* ------------------------------------------------------------------ */
    /* 5️⃣ DELETE MESSAGE (DELETE FOR ME) */
    /* ------------------------------------------------------------------ */
    socket.on("delete_message", async ({ messageId, matchId }) => {
      try {
        if (!messageId || !matchId) return;

        // 1️⃣ Mark message deleted for current user
        await ChatMessage.findByIdAndUpdate(messageId, {
          $addToSet: { deletedFor: currentUserId }
        });

        // 2️⃣ Notify ONLY this user to remove message from UI
        io.to(`user:${currentUserId}`).emit("message_deleted", {
          messageId,
          matchId
        });

        // 3️⃣ Recalculate last visible message for this user
        const lastVisibleMessage = await ChatMessage.findOne({
          matchId,
          deletedFor: { $ne: currentUserId }
        }).sort({ createdAt: -1 });

        // 4️⃣ Update chat list preview (only for this user)
        io.to(`user:${currentUserId}`).emit("chat_list_update", {
          matchId,
          lastMessage: lastVisibleMessage?.text || null,
          lastMessageAt: lastVisibleMessage?.createdAt || null
        });

      } catch (err) {
        console.error("❌ delete_message error:", err);
      }
    });


    /* ------------------------------------------------------------------ */
    /* 6️⃣ DELETE FOR EVERYONE */
    /* ------------------------------------------------------------------ */
    socket.on("delete_for_everyone", async ({ messageId, matchId }) => {
      try {
        if (!messageId || !matchId) return;

        const msg = await ChatMessage.findById(messageId);
        if (!msg) return;

        // 1️⃣ Only sender allowed
        if (msg.sender.toString() !== currentUserId) return;

        // 2️⃣ Optional: Time limit check (e.g. 10 min)
        const TEN_MIN = 10 * 60 * 1000;
        if (Date.now() - msg.createdAt.getTime() > TEN_MIN) return;

        // 3️⃣ Mark deleted for everyone
        await ChatMessage.findByIdAndUpdate(messageId, {
          isDeletedForEveryone: true,
          text: null,
          media: []
        });

        // 4️⃣ Notify BOTH users (chat room)
        io.to(`chat:${matchId}`).emit("message_deleted_everyone", {
          messageId,
          matchId
        });

        // 5️⃣ Update chat list preview for both users

        const lastMsg = await ChatMessage.findOne({
          matchId,
          isDeletedForEveryone: false
        }).sort({ createdAt: -1 });

        await Match.findByIdAndUpdate(matchId, {
          lastMessage: lastMsg?.text || "Message deleted",
          lastMessageAt: lastMsg?.createdAt || new Date()
        });

        const matchDoc = await Match.findById(matchId).lean();
        if (!matchDoc) return;

        matchDoc.users.forEach((uid) => {
          io.to(`user:${uid}`).emit("chat_list_update", {
            matchId,
            lastMessage: lastMsg?.text || "Message deleted",
            lastMessageAt: lastMsg?.createdAt || new Date()
          });
        });

      } catch (err) {
        console.error("❌ delete_for_everyone error:", err);
      }
    });


    // io.to(`chat:${matchId}`).emit("new_message", message);

    // io.to(`user:${receiverId}`).emit("chat_list_update", {
    //   matchId,
    //   lastMessage: "📷 Photo",
    //   lastMessageAt: message.createdAt,
    //   from: senderId
    // });







    /* ------------------------------------------------------------------ */
    /* 4️⃣ DISCONNECT */
    /* ------------------------------------------------------------------ */
    socket.on("disconnect", async () => {
      await redisClient.sRem(`user:sockets:${currentUserId}`, socket.id);

      const remaining = await redisClient.sCard(
        `user:sockets:${currentUserId}`
      );

      if (remaining === 0) {
        await redisClient.del(`user:online:${currentUserId}`);
      }

      console.log("🔌 SOCKET DISCONNECTED:", currentUserId);
    });
  });
};




// socket.on("send_message", async ({
//   matchId,
//   text = "",
//   type = "text",   // "text" | "media"
//   messageId       // 🔥 ONLY for media (DB already created)
// }) => {
//   try {
//     if (!matchId) return;

//     /* 1️⃣ Match validation */
//     const match = await Match.findById(matchId).lean();
//     if (!match) return;

//     const isParticipant = match.users.some(
//       (u) => u.toString() === currentUserId
//     );
//     if (!isParticipant) return;

//     const receiverId = match.users.find(
//       (u) => u.toString() !== currentUserId
//     );

//     let msg;

//     /* ======================================================
//        🟢 TEXT MESSAGE → DB + SOCKET
//     ====================================================== */
//     if (type === "text") {
//       if (!text.trim()) return;

//       msg = await ChatMessage.create({
//         matchId,
//         sender: currentUserId,
//         receiver: receiverId,
//         text: text.trim(),
//         status: "SENT"
//       });
//     }

//     /* ======================================================
//        🔵 MEDIA MESSAGE → DB ALREADY EXISTS (FROM UPLOAD API)
//     ====================================================== */
//     if (type === "media") {
//       if (!messageId) return;

//       msg = await ChatMessage.findById(messageId).lean();
//       if (!msg) return;
//     }

//     /* 3️⃣ Emit real-time message */
//     io.to(`chat:${matchId}`).emit("new_message", msg);

//     /* 4️⃣ Chat list reorder (receiver only) */
//     io.to(`user:${receiverId}`).emit("chat_list_update", {
//       matchId,
//       lastMessage: msg.media?.length ? "📷 Photo" : msg.text,
//       lastMessageAt: msg.createdAt,
//       from: currentUserId
//     });

//     /* 5️⃣ Delivery check */
//     const receiverOnline = await redisClient.exists(
//       `user:online:${receiverId}`
//     );

//     if (receiverOnline) {
//       await ChatMessage.findByIdAndUpdate(msg._id, {
//         status: "DELIVERED",
//         deliveredAt: new Date()
//       });

//       socket.emit("message_delivered", {
//         messageId: msg._id,
//         matchId
//       });
//     }

//   } catch (err) {
//     console.error("❌ send_message error:", err);
//   }
// });
