// const ChatMessage = require("../modules/matches/chat/chat.message.model");
// const { Match } = require("../modules/matches/swipe/swipe.model");
// const notificationService = require("../modules/notifications/notification.service");
// const { isBlocked } = require("../modules/profile/block.service")
// module.exports = function chatSocket(io, redisClient) {
//   io.on("connection", async (socket) => {
//     const currentUserId = socket.user._id.toString();

//     console.log("✅ SOCKET CONNECTED:", socket.id, "USER:", currentUserId);

//     /* ------------------------------------------------------------------ */
//     /* 🔹 USER LEVEL ROOM (VERY IMPORTANT) */
//     /* ------------------------------------------------------------------ */
//     socket.join(`user:${currentUserId}`);

//     await redisClient.set(`user:online:${currentUserId}`, "true");
//     await redisClient.sAdd(`user:sockets:${currentUserId}`, socket.id);

//     /* ------------------------------------------------------------------ */
//     /* 1️⃣ JOIN CHAT ROOM */
//     /* ------------------------------------------------------------------ */
//     socket.on("join_chat", async ({ matchId }) => {
//       try {
//         if (!matchId) return;

//         const match = await Match.findById(matchId).lean();
//         if (!match) return;

//         const otherUserId = match.users.find(
//           (u) => u.toString() !== currentUserId
//         );

//         const blocked = await isBlocked(currentUserId, otherUserId);
//         if (blocked) {
//   //           socket.emit("message_error", {
//   //   clientMessageId,
//   //   error: "BLOCKED",
//   //   message: "You cannot send messages to this user"
//   // });
//           return
//         }

//         const room = `chat:${matchId}`;
//         socket.join(room);

//         // Mark pending messages as DELIVERED
//         await ChatMessage.updateMany(
//           {
//             matchId,
//             receiver: currentUserId,
//             status: "SENT"
//           },
//           {
//             status: "DELIVERED",
//             deliveredAt: new Date()
//           }
//         );

//         console.log(`🎉 USER ${currentUserId} JOINED ROOM`, room);
//       } catch (err) {
//         console.error("❌ join_chat error:", err);
//       }
//     });

//     /* ------------------------------------------------------------------ */
//     /* 2️⃣ SEND MESSAGE */
//     /* ------------------------------------------------------------------ */
//     socket.on("send_message", async ({ matchId, text, clientMessageId }) => {
//       try {
//         if (!matchId || !text?.trim()) return;

//         /* 1️⃣ Match validation */
//         const match = await Match.findById(matchId).lean();
//         if (!match) return;

//         const isParticipant = match.users.some(
//           (u) => u.toString() === currentUserId
//         );
//         if (!isParticipant) return;

//         const receiverId = match.users.find(
//           (u) => u.toString() !== currentUserId
//         );

//         const blocked = await isBlocked(currentUserId, receiverId);
//         if (blocked) {
//           return; 
//         }


//         /* 2️⃣ Save message (DB = SOURCE OF TRUTH) */
//         const msg = await ChatMessage.create({
//           matchId,
//           sender: currentUserId,
//           receiver: receiverId,
//           text: text.trim(),
//           status: "SENT",
//           clientMessageId
//         });

//         /* 3️⃣ Update conversation metadata (CHAT LIST ORDER) */
//         await Match.findByIdAndUpdate(matchId, {
//           lastMessage: msg.text,
//           lastMessageAt: msg.createdAt,
//           lastMessageBy: currentUserId
//         });

//         /* 4️⃣ Emit message to chat room */
//         io.to(`chat:${matchId}`).emit("new_message", msg);

//         /* 5️⃣ 🔥 CHAT LIST TOP REORDER EVENT (USER LEVEL) */
//         io.to(`user:${receiverId}`).emit("chat_list_update", {
//           matchId,
//           lastMessage: msg.text,
//           lastMessageAt: msg.createdAt,
//           from: currentUserId
//         });

//         /* 6️⃣ DELIVERY CHECK (NO fetchSockets ❌) */
//         const receiverOnline = await redisClient.exists(
//           `user:online:${receiverId}`
//         );

//         if (receiverOnline) {
//           await ChatMessage.findByIdAndUpdate(msg._id, {
//             status: "DELIVERED",
//             deliveredAt: new Date()
//           });

//           socket.emit("message_delivered", {
//             messageId: msg._id,
//             matchId
//           });
//         }

//         /* 7️⃣ BACKGROUND WORK (WORKER) */
//         await notificationService.add("new_message", {
//           senderId: currentUserId,
//           receiverId,
//           matchId,
//           messageId: msg._id,
//           text: msg.text
//         });
//       } catch (err) {
//         console.error("❌ send_message error:", err);
//       }
//     });


//     /* ------------------------------------------------------------------ */
//     /* 3️⃣ MESSAGE READ */
//     /* ------------------------------------------------------------------ */
//     socket.on("messages_read", async ({ matchId }) => {
//       try {
//         await ChatMessage.updateMany(
//           {
//             matchId,
//             receiver: currentUserId,
//             status: { $ne: "READ" }
//           },
//           {
//             status: "READ",
//             // read : "true",
//             readAt: new Date()
//           }
//         );

//         io.to(`chat:${matchId}`).emit("messages_read", {
//           matchId,
//           reader: currentUserId
//         });
//       } catch (err) {
//         console.error("❌ messages_read error:", err);
//       }
//     });

//     socket.on("typing", ({ matchId, isTyping }) => {
//       if (!matchId) return;

//       const room = `chat:${matchId}`;

//       // sender ko chhod ke sabko bhejo
//       socket.to(room).emit("user_typing", {
//         userId: socket.user._id.toString(),
//         isTyping
//       });
//     });

//     /* ------------------------------------------------------------------ */
//     /* 5️⃣ DELETE MESSAGE (DELETE FOR ME) */
//     /* ------------------------------------------------------------------ */
//     socket.on("delete_message", async ({ messageId, matchId }) => {
//       try {
//         if (!messageId || !matchId) return;

//         // 1️⃣ Mark message deleted for current user
//         await ChatMessage.findByIdAndUpdate(messageId, {
//           $addToSet: { deletedFor: currentUserId }
//         });

//         // 2️⃣ Notify ONLY this user to remove message from UI
//         io.to(`user:${currentUserId}`).emit("message_deleted", {
//           messageId,
//           matchId
//         });

//         // 3️⃣ Recalculate last visible message for this user
//         const lastVisibleMessage = await ChatMessage.findOne({
//           matchId,
//           deletedFor: { $ne: currentUserId }
//         }).sort({ createdAt: -1 });

//         // 4️⃣ Update chat list preview (only for this user)
//         io.to(`user:${currentUserId}`).emit("chat_list_update", {
//           matchId,
//           lastMessage: lastVisibleMessage?.text || null,
//           lastMessageAt: lastVisibleMessage?.createdAt || null
//         });

//       } catch (err) {
//         console.error("❌ delete_message error:", err);
//       }
//     });


//     /* ------------------------------------------------------------------ */
//     /* 6️⃣ DELETE FOR EVERYONE */
//     /* ------------------------------------------------------------------ */
//     socket.on("delete_for_everyone", async ({ messageId, matchId }) => {
//       try {
//         if (!messageId || !matchId) return;

//         const msg = await ChatMessage.findById(messageId);
//         if (!msg) return;

//         // 1️⃣ Only sender allowed
//         if (msg.sender.toString() !== currentUserId) return;

//         // 2️⃣ Optional: Time limit check (e.g. 10 min)
//         const TEN_MIN = 10 * 60 * 1000;
//         if (Date.now() - msg.createdAt.getTime() > TEN_MIN) return;

//         // 3️⃣ Mark deleted for everyone
//         await ChatMessage.findByIdAndUpdate(messageId, {
//           isDeletedForEveryone: true,
//           text: null,
//           media: []
//         });

//         // 4️⃣ Notify BOTH users (chat room)
//         io.to(`chat:${matchId}`).emit("message_deleted_everyone", {
//           messageId,
//           matchId
//         });

//         // 5️⃣ Update chat list preview for both users

//         const lastMsg = await ChatMessage.findOne({
//           matchId,
//           isDeletedForEveryone: false
//         }).sort({ createdAt: -1 });

//         await Match.findByIdAndUpdate(matchId, {
//           lastMessage: lastMsg?.text || "Message deleted",
//           lastMessageAt: lastMsg?.createdAt || new Date()
//         });

//         const matchDoc = await Match.findById(matchId).lean();
//         if (!matchDoc) return;

//         matchDoc.users.forEach((uid) => {
//           io.to(`user:${uid}`).emit("chat_list_update", {
//             matchId,
//             lastMessage: lastMsg?.text || "Message deleted",
//             lastMessageAt: lastMsg?.createdAt || new Date()
//           });
//         });

//       } catch (err) {
//         console.error("❌ delete_for_everyone error:", err);
//       }
//     });


//     // io.to(`chat:${matchId}`).emit("new_message", message);

//     // io.to(`user:${receiverId}`).emit("chat_list_update", {
//     //   matchId,
//     //   lastMessage: "📷 Photo",
//     //   lastMessageAt: message.createdAt,
//     //   from: senderId
//     // });



// socket.on("leave_chat", ({ matchId }) => {
//   if (!matchId) return;
//   socket.leave(`chat:${matchId}`);
//   console.log(`👋 USER ${currentUserId} LEFT ROOM chat:${matchId}`);
// });





//     /* ------------------------------------------------------------------ */
//     /* 4️⃣ DISCONNECT */
//     /* ------------------------------------------------------------------ */
//     socket.on("disconnect", async () => {
//       await redisClient.sRem(`user:sockets:${currentUserId}`, socket.id);

//       const remaining = await redisClient.sCard(
//         `user:sockets:${currentUserId}`
//       );

//       if (remaining === 0) {
//         await redisClient.del(`user:online:${currentUserId}`);
//       }

//       console.log("🔌 SOCKET DISCONNECTED:", currentUserId);
//     });
//   });
// };




// // if (text.length > 5000) {
// //   socket.emit("message_error", {
// //     error: "TEXT_TOO_LONG",
// //     message: "Message exceeds 5000 characters"
// //   });
// //   return;
// // }




// // socket.on("send_message", async ({
// //   matchId,
// //   text = "",
// //   type = "text",   // "text" | "media"
// //   messageId       // 🔥 ONLY for media (DB already created)
// // }) => {
// //   try {
// //     if (!matchId) return;

// //     /* 1️⃣ Match validation */
// //     const match = await Match.findById(matchId).lean();
// //     if (!match) return;

// //     const isParticipant = match.users.some(
// //       (u) => u.toString() === currentUserId
// //     );
// //     if (!isParticipant) return;

// //     const receiverId = match.users.find(
// //       (u) => u.toString() !== currentUserId
// //     );

// //     let msg;

// //     /* ======================================================
// //        🟢 TEXT MESSAGE → DB + SOCKET
// //     ====================================================== */
// //     if (type === "text") {
// //       if (!text.trim()) return;

// //       msg = await ChatMessage.create({
// //         matchId,
// //         sender: currentUserId,
// //         receiver: receiverId,
// //         text: text.trim(),
// //         status: "SENT"
// //       });
// //     }

// //     /* ======================================================
// //        🔵 MEDIA MESSAGE → DB ALREADY EXISTS (FROM UPLOAD API)
// //     ====================================================== */
// //     if (type === "media") {
// //       if (!messageId) return;

// //       msg = await ChatMessage.findById(messageId).lean();
// //       if (!msg) return;
// //     }

// //     /* 3️⃣ Emit real-time message */
// //     io.to(`chat:${matchId}`).emit("new_message", msg);

// //     /* 4️⃣ Chat list reorder (receiver only) */
// //     io.to(`user:${receiverId}`).emit("chat_list_update", {
// //       matchId,
// //       lastMessage: msg.media?.length ? "📷 Photo" : msg.text,
// //       lastMessageAt: msg.createdAt,
// //       from: currentUserId
// //     });

// //     /* 5️⃣ Delivery check */
// //     const receiverOnline = await redisClient.exists(
// //       `user:online:${receiverId}`
// //     );

// //     if (receiverOnline) {
// //       await ChatMessage.findByIdAndUpdate(msg._id, {
// //         status: "DELIVERED",
// //         deliveredAt: new Date()
// //       });

// //       socket.emit("message_delivered", {
// //         messageId: msg._id,
// //         matchId
// //       });
// //     }

// //   } catch (err) {
// //     console.error("❌ send_message error:", err);
// //   }
// // });






