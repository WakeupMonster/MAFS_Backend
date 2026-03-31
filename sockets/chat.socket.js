const ChatMessage = require("../modules/matches/chat/chat.message.model");
const { Match } = require("../modules/matches/swipe/swipe.model");
const { addNotificationJob } = require("../queues/notification.queue");
const { NOTIFICATION_TYPES } = require("../modules/notifications/notification.enums");
const { isBlocked } = require("../modules/profile/block.service");

// TODO: Uncomment after verifying correct import path
// const { destroy } = require("../modules/upload/cloudinary.service");

module.exports = function chatSocket(io, redisClient) {
  io.on("connection", async (socket) => {
    const currentUserId = socket.user._id.toString();

    console.log("✅ SOCKET CONNECTED:", socket.id, "USER:", currentUserId);

    /* ------------------------------------------------------------------ */
    /* 🔹 USER LEVEL ROOM                                                 */
    /* ------------------------------------------------------------------ */
    socket.join(`user:${currentUserId}`);

    /* ------------------------------------------------------------------ */
    /* 🔹 REDIS ONLINE STATUS + PENDING DELIVERY ON CONNECT               */
    /* ------------------------------------------------------------------ */
    /*
     * Redis operations wrapped in try-catch because:
     * 1. Redis temporarily down ho sakta hai (network blip, restart)
     * 2. Bina try-catch ke error throw hoga → socket connect nahi hoga
     * 3. Chat functionality Redis ke bina bhi kaam karni chahiye
     *    (sirf online status miss hoga, messages toh DB se aate hain)
     */
    try {
      await redisClient.set(`user:online:${currentUserId}`, "true");
      await redisClient.sAdd(`user:sockets:${currentUserId}`, socket.id);
    } catch (redisErr) {
      console.error("❌ Redis online status error:", redisErr);
    }

    /*
     * PENDING DELIVERY: Jab user offline tha, uske liye aaye SENT messages
     * ko DELIVERED mark karo. Bina iske sender ko kabhi delivery tick nahi
     * dikhta jab tak receiver specific chat room join na kare.
     *
     * .select() se sirf zaroori fields laao — poore documents ki zaroorat nahi.
     * .limit(500) se ek baar mein zyada load nahi aayega.
     */
    try {
      const pendingMessages = await ChatMessage.find({
        receiver: currentUserId,
        status: "SENT",
      })
        .select("sender matchId")
        .limit(500)
        .lean();

      if (pendingMessages.length > 0) {
        await ChatMessage.updateMany(
          { receiver: currentUserId, status: "SENT" },
          { status: "DELIVERED", deliveredAt: new Date() }
        );

        /*
         * Unique senders ko notify karo per match.
         * Set use kiya taaki same sender:match pair ke liye
         * duplicate events na jayein.
         */
        const notified = new Set();
        pendingMessages.forEach((m) => {
          const key = `${m.sender}:${m.matchId}`;
          if (!notified.has(key)) {
            notified.add(key);
            io.to(`user:${m.sender}`).emit("messages_delivered", {
              matchId: m.matchId,
              deliveredAt: new Date(),
            });
          }
        });
      }
    } catch (err) {
      console.error("❌ Pending delivery error:", err);
    }

    /* ------------------------------------------------------------------ */
    /* 1️⃣ JOIN CHAT ROOM                                                  */
    /* ------------------------------------------------------------------ */
    socket.on("join_chat", async ({ matchId }) => {
      try {
        if (!matchId) return;

        const match = await Match.findById(matchId).lean();
        if (!match) return;

        /*
         * Participant validation: Bina iske koi bhi random matchId bhej ke
         * doosron ki private chat room join kar sakta hai — security risk.
         */
        const isParticipant = match.users.some(
          (u) => u.toString() === currentUserId
        );
        if (!isParticipant) return;

        const otherUserId = match.users.find(
          (u) => u.toString() !== currentUserId
        );

        const blocked = await isBlocked(currentUserId, otherUserId);
        if (blocked.isBlocked) {
          /*
           * Blocked user ko feedback: Bina iske user confused hota hai
           * ki chat kyun kaam nahi kar rahi.
           */
          socket.emit("chat_error", {
            type: "BLOCKED",
            matchId,
            message: "You cannot access this chat",
            isBlockedByMe : blocked.blockedByMe,
            blockedBy: blocked.blockedBy  
          });
          return;
        }

        const room = `chat:${matchId}`;
        socket.join(room);

        // Mark pending messages as DELIVERED
        const deliveryResult = await ChatMessage.updateMany(
          {
            matchId,
            receiver: currentUserId,
            status: "SENT",
          },
          {
            status: "DELIVERED",
            deliveredAt: new Date(),
          }
        );

        /*
         * Sender ko delivery notification: Bina iske sender ke screen pe
         * single tick rehta hai jabki messages actually deliver ho chuke hain.
         */
        if (deliveryResult.modifiedCount > 0) {
          io.to(`user:${otherUserId}`).emit("messages_delivered", {
            matchId,
            deliveredAt: new Date(),
          });
        }

        console.log(`🎉 USER ${currentUserId} JOINED ROOM`, room);
      } catch (err) {
        console.error("❌ join_chat error:", err);
      }
    });

    /* ------------------------------------------------------------------ */
    /* 2️⃣ SEND MESSAGE (TEXT + MEDIA UNIFIED)                             */
    /* ------------------------------------------------------------------ */
    /*
     * FLOW EXPLAINED:
     *
     * TEXT MESSAGE (type = "text"):
     *   Flutter emits → Server creates ChatMessage in DB → Emits to room
     *
     * MEDIA MESSAGE (type = "media"):
     *   Flutter calls POST /upload-media → Server saves ChatMessage in DB
     *   → Returns messageId → Flutter emits send_message with messageId
     *   → Server fetches existing message → Emits to room
     *
     * Kyu do steps media ke liye?
     *   Kyunki file upload heavy operation hai (Cloudinary upload, multipart parsing)
     *   Ye REST API se hona chahiye, socket se nahi (socket lightweight events ke liye hai)
     *   Lekin real-time notification socket se jaani chahiye
     */
    socket.on(
      "send_message",
      async (
        {
          matchId,
          text = "",
          type = "text",
          messageId: mediaMessageId,
          clientMessageId,
        },
        ack
      ) => {
        try {
          /* ── Common: matchId required ── */
          if (!matchId) {
            if (typeof ack === "function") {
              ack({ success: false, error: "matchId is required" });
            }
            return;
          }

          /* ── Common: Match validation ── */
          const match = await Match.findById(matchId).lean();
          if (!match) {
            if (typeof ack === "function") {
              ack({ success: false, error: "Match not found" });
            }
            return;
          }

          /* ── Common: Participant check ── */
          const isParticipant = match.users.some(
            (u) => u.toString() === currentUserId
          );
          if (!isParticipant) {
            if (typeof ack === "function") {
              ack({ success: false, error: "Not authorized" });
            }
            return;
          }

          /* ── Common: Get receiverId from match (NOT from client) ── */
          const receiverId = match.users.find(
            (u) => u.toString() !== currentUserId
          );

          /* ── Common: Block check ── */
          const blocked = await isBlocked(currentUserId, receiverId);
          if (blocked.isBlocked) {
            socket.emit("chat_error", {
              type: "BLOCKED",
              matchId,
              clientMessageId,
              message: "You cannot send messages to this user",
              isBlockedByMe: blocked.blockedByMe,
              blockedBy: blocked.blockedBy  
            });
            if (typeof ack === "function") {
              ack({ success: false, error: "Cannot send message" });
            }
            return;
          }

          let msg;

          /* ============================================================
             🟢 TEXT MESSAGE → Create new message in DB
          ============================================================ */
          if (type === "text") {
            if (!text.trim()) {
              if (typeof ack === "function") {
                ack({ success: false, error: "Text is required" });
              }
              return;
            }

            /*
             * Text length limit: Bina iske koi 1 lakh character ka message
             * bhej ke DB aur bandwidth waste kar sakta hai.
             */
            const trimmedText = text.trim();
            if (trimmedText.length > 5000) {
              if (typeof ack === "function") {
                ack({
                  success: false,
                  error: "Message too long (max 5000 characters)",
                });
              }
              return;
            }

            const msgData = {
              matchId,
              sender: currentUserId,
              receiver: receiverId,
              text: trimmedText,
              status: "SENT",
            };

            if (clientMessageId) {
              msgData.clientMessageId = clientMessageId;
            }

            msg = await ChatMessage.create(msgData);
          }

          /* ============================================================
             🔵 MEDIA MESSAGE → Message already exists in DB (from upload API)
                 Sirf real-time notification bhejni hai
          ============================================================ */
          if (type === "media") {
            if (!mediaMessageId) {
              if (typeof ack === "function") {
                ack({
                  success: false,
                  error: "messageId is required for media type",
                });
              }
              return;
            }

            msg = await ChatMessage.findById(mediaMessageId).lean();
            if (!msg) {
              if (typeof ack === "function") {
                ack({ success: false, error: "Media message not found" });
              }
              return;
            }

            /*
             * Security: Verify current user is actually the sender of this message.
             * Bina iske koi doosre ka messageId bhej ke uske message ko
             * apne naam se emit karwa sakta hai.
             */
            if (msg.sender.toString() !== currentUserId) {
              if (typeof ack === "function") {
                ack({ success: false, error: "Not authorized" });
              }
              return;
            }

            /*
             * Verify message belongs to this match.
             * Bina iske koi match A ka media message match B mein emit karwa sakta hai.
             */
            if (msg.matchId.toString() !== matchId) {
              if (typeof ack === "function") {
                ack({
                  success: false,
                  error: "Message does not belong to this match",
                });
              }
              return;
            }
          }

          /* ============================================================
             🔥 COMMON OPERATIONS (Text + Media dono ke liye)
          ============================================================ */

          /*
           * Last message preview: Media ke liye "📷 Media" dikhega chat list mein,
           * text ke liye actual text.
           * Upload API Match.lastMessage update NAHI karti — yahan karna zaroori hai.
           */
          const lastMessagePreview =
            msg.media && msg.media.length > 0 ? "📷 Media" : msg.text;

          /* Update conversation metadata (Chat list ordering) */
          await Match.findByIdAndUpdate(matchId, {
            lastMessage: lastMessagePreview,
            lastMessageAt: msg.createdAt,
            lastMessageBy: currentUserId,
          });

          /* Emit message to chat room (dono users ko milega agar room mein hain) */
          io.to(`chat:${matchId}`).emit("new_message", msg);

          /* Chat list reorder for receiver (chahe kisi bhi screen pe ho) */
          io.to(`user:${receiverId}`).emit("chat_list_update", {
            matchId,
            lastMessage: lastMessagePreview,
            lastMessageAt: msg.createdAt,
            from: currentUserId,
          });

          /*
           * ACK to sender: Flutter ko turant confirmation milti hai ki
           * message process ho gaya. Bina iske message "sending" state mein
           * atak jaata hai aur Flutter ko timeout guess karna padta.
           *
           * typeof check zaroori hai kyunki agar Flutter normal emit use kare
           * bina callback ke, toh ack undefined hoga — error aayega.
           */
          if (typeof ack === "function") {
            ack({
              success: true,
              messageId: msg._id,
              createdAt: msg.createdAt,
            });
          }

          /*
           * Delivery check: Redis se check karo receiver online hai ya nahi.
           * try-catch mein hai kyunki Redis down hone pe message toh bhej chuke,
           * sirf delivery status miss hoga — acceptable fallback.
           */
          try {
            const receiverOnline = await redisClient.exists(
              `user:online:${receiverId}`
            );

            if (receiverOnline) {
              await ChatMessage.findByIdAndUpdate(msg._id, {
                status: "DELIVERED",
                deliveredAt: new Date(),
              });

              socket.emit("message_delivered", {
                messageId: msg._id,
                matchId,
              });
            }
          } catch (redisErr) {
            console.error("❌ Redis delivery check error:", redisErr);
          }

          /* Push notification (background worker) */
          try {
            // 🧠 PRESENCE CHECK: Check if receiver is actively watching this chat room
            const receiverSockets = await io.in(`user:${receiverId}`).fetchSockets();
            const isReceiverWatchingChat = receiverSockets.some(s => s.rooms.has(`chat:${matchId}`));

            if (!isReceiverWatchingChat) {
              // 📱 User is NOT on the chat screen (either minimized or on another page) -> SEND PUSH
              await addNotificationJob(NOTIFICATION_TYPES.NEW_MESSAGE, {
                senderId: currentUserId,
                receiverId: receiverId.toString(),
                messageText: lastMessagePreview,
              });
              console.log(`📩 Push queued: User ${receiverId} is not in chat:${matchId}`);
            } else {
              // 🔇 User is actively looking at the chat screen -> SKIP PUSH
              console.log(`🔇 Push skipped: User ${receiverId} is actively watching chat:${matchId}`);
            }
          } catch (notifErr) {
            console.error("❌ Notification queue error:", notifErr);
          }
        } catch (err) {
          console.error("❌ send_message error:", err);
          if (typeof ack === "function") {
            ack({ success: false, error: "Failed to send message" });
          }
        }
      }
    );

    /* ------------------------------------------------------------------ */
    /* 3️⃣ MESSAGE READ                                                    */
    /* ------------------------------------------------------------------ */
    socket.on("messages_read", async ({ matchId }) => {
      try {
        if (!matchId) return;

        /*
         * Match + Participant validation: Bina iske koi bhi random matchId bhej ke
         * doosron ke messages read mark kar sakta hai — security issue.
         */
        const match = await Match.findById(matchId).lean();
        if (!match) return;

        const isParticipant = match.users.some(
          (u) => u.toString() === currentUserId
        );
        if (!isParticipant) return;

        const result = await ChatMessage.updateMany(
          {
            matchId,
            receiver: currentUserId,
            status: { $ne: "READ" },
          },
          {
            status: "READ",
            readAt: new Date(),
          }
        );

        /*
         * Sirf tab emit karo jab actually kuch update hua.
         * Bina iske har baar chat open karne pe unnecessary event jaata hai
         * aur Flutter mein useless re-render hota hai.
         */
        if (result.modifiedCount > 0) {
          io.to(`chat:${matchId}`).emit("messages_read", {
            matchId,
            reader: currentUserId,
            readAt: new Date(),
          });
        }
      } catch (err) {
        console.error("❌ messages_read error:", err);
      }
    });

    /* ------------------------------------------------------------------ */
    /* 🔹 TYPING INDICATOR                                                 */
    /* ------------------------------------------------------------------ */
    socket.on("typing", ({ matchId, isTyping }) => {
      if (!matchId) return;

      /*
       * Room membership check: Sirf usi room mein typing event bhejo
       * jismein user actually joined hai. Bina iske koi bhi kisi bhi
       * matchId ke liye fake typing indicator cause kar sakta hai.
       */
      if (!socket.rooms.has(`chat:${matchId}`)) return;

      socket.to(`chat:${matchId}`).emit("user_typing", {
        userId: currentUserId,
        /*
         * matchId include karo payload mein: Flutter dev ko pata hona chahiye
         * typing indicator kaunsi chat ke liye hai — future mein multiple
         * chat windows support karne pe ye zaroori hoga.
         */
        matchId,
        isTyping,
      });
    });

    /* ------------------------------------------------------------------ */
    /* 5️⃣ DELETE MESSAGE (DELETE FOR ME)                                   */
    /* ------------------------------------------------------------------ */
    socket.on("delete_message", async ({ messageId, matchId }) => {
      try {
        if (!messageId || !matchId) return;

        /*
         * Message validation: Bina iske:
         * 1. Invalid messageId se null update hota hai — waste DB operation
         * 2. User kisi ka bhi message delete kar sakta hai apne liye
         * 3. Match-message mismatch ho sakta hai
         */
        const msg = await ChatMessage.findById(messageId).lean();
        if (!msg) {
          socket.emit("chat_error", {
            type: "NOT_FOUND",
            messageId,
            message: "Message not found",
          });
          return;
        }

        // User is sender ya receiver hona chahiye — doosre ka message nahi delete kar sakte
        if (
          msg.sender.toString() !== currentUserId &&
          msg.receiver.toString() !== currentUserId
        ) {
          return;
        }

        // Message usi match ka hona chahiye
        if (msg.matchId.toString() !== matchId) return;

        // Soft delete for current user
        await ChatMessage.findByIdAndUpdate(messageId, {
          $addToSet: { deletedFor: currentUserId },
        });

        // Notify only this user
        io.to(`user:${currentUserId}`).emit("message_deleted", {
          messageId,
          matchId,
        });

        /*
         * Last visible message query mein isDeletedForEveryone filter:
         * Bina iske jo message everyone ke liye delete ho chuka hai
         * wo bhi chat list preview mein aa sakta hai.
         */
        const lastVisibleMessage = await ChatMessage.findOne({
          matchId,
          deletedFor: { $ne: currentUserId },
          isDeletedForEveryone: { $ne: true },
        })
          .sort({ createdAt: -1 })
          .lean();

        // Chat list preview update (sirf is user ke liye)
        io.to(`user:${currentUserId}`).emit("chat_list_update", {
          matchId,
          lastMessage: lastVisibleMessage?.text || null,
          lastMessageAt: lastVisibleMessage?.createdAt || null,
        });
      } catch (err) {
        console.error("❌ delete_message error:", err);
      }
    });

    /* ------------------------------------------------------------------ */
    /* 6️⃣ DELETE FOR EVERYONE                                             */
    /* ------------------------------------------------------------------ */
    socket.on("delete_for_everyone", async ({ messageId, matchId }) => {
      try {
        if (!messageId || !matchId) return;

        const msg = await ChatMessage.findById(messageId);
        if (!msg) {
          socket.emit("chat_error", {
            type: "NOT_FOUND",
            messageId,
            message: "Message not found",
          });
          return;
        }

        // Only sender can delete for everyone
        if (msg.sender.toString() !== currentUserId) {
          socket.emit("chat_error", {
            type: "FORBIDDEN",
            messageId,
            matchId,
            message: "Only sender can delete for everyone",
          });
          return;
        }

        // Time limit check (10 min)
        const TEN_MIN = 10 * 60 * 1000;
        if (Date.now() - msg.createdAt.getTime() > TEN_MIN) {
          /*
           * Error feedback: Bina iske user delete button dabata hai,
           * kuch nahi hota — sochta hai bug hai ya network issue.
           */
          socket.emit("chat_error", {
            type: "TIME_EXPIRED",
            messageId,
            matchId,
            message: "Cannot delete after 10 minutes",
          });
          return;
        }

        /*
         * TODO: Cloudinary se media delete karo BEFORE clearing DB.
         *
         * Current problem: media: [] set ho jaata hai DB mein but actual files
         * Cloudinary pe PERMANENTLY orphaned reh jaati hain — storage cost
         * badhti rahegi har delete ke saath.
         *
         * Uncomment below AFTER verifying cloudinary import path at top:
         *
         * if (msg.media && msg.media.length > 0) {
         *   try {
         *     await Promise.all(
         *       msg.media.map((m) => (m.publicId ? destroy(m.publicId) : null))
         *     );
         *   } catch (cloudErr) {
         *     console.error("❌ Cloudinary cleanup error:", cloudErr);
         *   }
         * }
         */

        // Mark deleted for everyone
        await ChatMessage.findByIdAndUpdate(messageId, {
          isDeletedForEveryone: true,
          text: null,
          media: [],
        });

        // Notify both users (chat room)
        io.to(`chat:${matchId}`).emit("message_deleted_everyone", {
          messageId,
          matchId,
        });

        // Find last valid message for chat list preview
        const lastMsg = await ChatMessage.findOne({
          matchId,
          isDeletedForEveryone: { $ne: true },
        })
          .sort({ createdAt: -1 })
          .lean();

        // Update Match model (chat list ordering)
        await Match.findByIdAndUpdate(matchId, {
          lastMessage: lastMsg?.text || "Message deleted",
          lastMessageAt: lastMsg?.createdAt || new Date(),
        });

        /*
         * Dono users ko chat list update.
         *
         * msg.sender aur msg.receiver se IDs nikal rahe hain — pehle
         * Match.findById dobara call hoti thi sirf IDs ke liye.
         * Ye extra DB query eliminate hui.
         */
        const senderIdStr = msg.sender.toString();
        const receiverIdStr = msg.receiver.toString();

        [senderIdStr, receiverIdStr].forEach((uid) => {
          io.to(`user:${uid}`).emit("chat_list_update", {
            matchId,
            lastMessage: lastMsg?.text || "Message deleted",
            lastMessageAt: lastMsg?.createdAt || new Date(),
          });
        });
      } catch (err) {
        console.error("❌ delete_for_everyone error:", err);
      }
    });

    /* ------------------------------------------------------------------ */
    /* 🔹 LEAVE CHAT ROOM                                                  */
    /* ------------------------------------------------------------------ */
    socket.on("leave_chat", ({ matchId }) => {
      if (!matchId) return;
      socket.leave(`chat:${matchId}`);
      console.log(`👋 USER ${currentUserId} LEFT ROOM chat:${matchId}`);
    });

    /* ------------------------------------------------------------------ */
    /* 4️⃣ DISCONNECT                                                      */
    /* ------------------------------------------------------------------ */
    socket.on("disconnect", async () => {
      /*
       * try-catch: Redis down hone pe bina iske unhandled error aayega
       * aur user permanently "online" dikhega kyunki cleanup nahi hogi.
       */
      try {
        await redisClient.sRem(`user:sockets:${currentUserId}`, socket.id);

        const remaining = await redisClient.sCard(
          `user:sockets:${currentUserId}`
        );

        if (remaining === 0) {
          await redisClient.del(`user:online:${currentUserId}`);
        }

        console.log("🔌 SOCKET DISCONNECTED:", currentUserId);
      } catch (err) {
        console.error("❌ Disconnect cleanup error:", err);
      }
    });
  });
};