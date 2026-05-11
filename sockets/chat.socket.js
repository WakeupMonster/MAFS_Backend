const ChatMessage = require("../modules/matches/chat/chat.message.model");
const { Match } = require("../modules/matches/swipe/swipe.model");
const { addNotificationJob } = require("../queues/notification.queue");
const { NOTIFICATION_TYPES } = require("../modules/notifications/notification.enums");
const { isBlocked } = require("../modules/profile/block.service");
const adminEvents = require("../events/admin.events");
const chatEvents = require("../events/chat.events");
// TODO: Uncomment after verifying correct import path
// const { destroy } = require("../modules/upload/cloudinary.service");

module.exports = function chatSocket(io, redisClient) {
  // ─── Real-time events from Controllers ───
  chatEvents.on("match_deleted", ({ matchId, userId1, userId2 }) => {
    [userId1, userId2].forEach((uid) => {
      io.to(`user:${uid}`).emit("match_deleted", { matchId });
    });
    console.log(`🔌 Socket: match_deleted emitted to users of match ${matchId}`);
  });
  io.on("connection", async (socket) => {
    const currentUserId = socket.user._id.toString();

    // Security: onAny admin backdoor removed — admin room access only via dedicated event with role check below

    /* ------------------------------------------------------------------ */
    /* 🔹 USER LEVEL ROOM                                                 */
    /* ------------------------------------------------------------------ */
    socket.join(`user:${currentUserId}`);

    try {
      await redisClient.set(`user:online:${currentUserId}`, "true", "EX", 86400); // 24h TTL
      await redisClient.sAdd(`user:sockets:${currentUserId}`, socket.id);
      await redisClient.expire(`user:sockets:${currentUserId}`, 86400); // 24h TTL
    } catch (redisErr) {
      console.error("❌ Redis online status error:", redisErr);
    }

    /*
     * 🚨 OPTIMIZATION (Arena AI Fix): Removed PENDING DELIVERY logic from connection.
     * Touch MongoDB on connection is a massive bottleneck at scale.
     * Logic moved to 'join_chat' and 'messages_read'.
     */



    /* ------------------------------------------------------------------ */
    /* 1️⃣ JOIN CHAT ROOM                                                  */
    /* ------------------------------------------------------------------ */
    socket.on("join_chat", async ({ matchId }) => {
      try {
        if (!matchId) return;

        const match = await Match.findById(matchId).lean();
        if (!match) {
          socket.emit("chat_error", {
            type: "UNMATCHED",
            matchId,
            message: "Match no longer exists or has been unmatched"
          });
          return;
        }

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
        if (blocked.isBlocked && !blocked.blockedByMe) {
          /*
           * Blocked user ko feedback: Bina iske user confused hota hai
           * ki chat kyun kaam nahi kar rahi.
           */
          socket.emit("chat_error", {
            type: "BLOCKED",
            matchId,
            message: "You cannot access this chat",
            isBlockedByMe: blocked.blockedByMe,
            blockedBy: blocked.blockedBy
          });
          return;
        }

        const room = `chat:${matchId}`;
        socket.join(room);

        // 🚀 Arena AI Optimization: Track active room in Redis for fast presence check
        // Using set without TTL because user might keep chat open > 1 hour. Cleaned up on disconnect.
        try {
            await redisClient.set(`user:active_room:${currentUserId}`, matchId);
        } catch (err) {
            console.error("❌ Redis active_room set error:", err);
        }

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

          /* ── Common: Block check (🚀 Arena AI Optimization: Redis Cache) ── */
          const blockCacheKey = `block:${currentUserId}:${receiverId}`;
          let blockedStatus = await redisClient.get(blockCacheKey);

          if (blockedStatus) {
            blockedStatus = JSON.parse(blockedStatus);
          } else {
            blockedStatus = await isBlocked(currentUserId, receiverId);
            // Cache for 5 minutes (300s)
            await redisClient.setex(blockCacheKey, 300, JSON.stringify(blockedStatus));
          }

          if (blockedStatus.isBlocked) {
            socket.emit("chat_error", {
              type: "BLOCKED",
              matchId,
              clientMessageId,
              message: "You cannot send messages to this user",
              isBlockedByMe: blockedStatus.blockedByMe,
              blockedBy: blockedStatus.blockedBy
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
             * Text length limit: 
             * Emitting chat_error so frontend knows WHY message failed.
             */
            const trimmedText = text.trim();
            if (trimmedText.length > 5000) {
              socket.emit("chat_error", {
                type: "LIMIT_EXCEEDED",
                matchId,
                clientMessageId,
                message: "Message too long (max 5000 characters)",
              });
              if (typeof ack === "function") {
                ack({
                  success: false,
                  error: "Message too long",
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

          /* 
           * Update conversation metadata (🚀 Arena AI Optimization: ASYNC)
           * Don't wait for DB update to finish before emitting the message.
           */
          setImmediate(async () => {
            try {
              await Match.findByIdAndUpdate(matchId, {
                lastMessage: lastMessagePreview,
                lastMessageAt: msg.createdAt,
                lastMessageBy: currentUserId,
              });
            } catch (err) {
              console.error("❌ Async match update error:", err);
            }
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
           * Delivery check (🚀 Arena AI Optimization: Removed heavy DB write)
           * Instead of updating every message in DB on delivery, we rely on 
           * the receiver's 'join_chat' or 'messages_read' to batch update.
           * We only notify the sender that the user is online.
           */
          try {
            const receiverOnline = await redisClient.exists(
              `user:online:${receiverId}`
            );

            if (receiverOnline) {
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
            // 🧠 PRESENCE CHECK (🚀 Arena AI Optimization: Redis instead of fetchSockets)
            // Check if receiver is actively watching this specific chat room
            const activeRoom = await redisClient.get(`user:active_room:${receiverId}`);
            const isReceiverWatchingChat = activeRoom === matchId;

            if (!isReceiverWatchingChat) {
              // 📱 User is NOT on the chat screen -> SEND PUSH
              await addNotificationJob(NOTIFICATION_TYPES.NEW_MESSAGE, {
                senderId: currentUserId,
                receiverId: receiverId.toString(),
                messageText: lastMessagePreview,
              });
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

        // 🛡️ Block validation for read status (🚀 Arena AI Optimization: Redis Cache)
        const otherUserId = match.users.find((u) => u.toString() !== currentUserId);
        const blockCacheKey = `block:${currentUserId}:${otherUserId}`;
        let blockedStatus = await redisClient.get(blockCacheKey);

        if (blockedStatus) {
            blockedStatus = JSON.parse(blockedStatus);
        } else {
            blockedStatus = await isBlocked(currentUserId, otherUserId);
            // Cache for 5 minutes (300s)
            await redisClient.setex(blockCacheKey, 300, JSON.stringify(blockedStatus));
        }

        if (blockedStatus.isBlocked && !blockedStatus.blockedByMe) {
            // If I am the one who is blocked, I can't update read status
            return;
        }

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
    socket.on("leave_chat", async ({ matchId }) => {
      if (!matchId) return;
      socket.leave(`chat:${matchId}`);
      
      // 🚀 Arena AI Optimization: Clear active room in Redis
      try {
          await redisClient.del(`user:active_room:${currentUserId}`);
      } catch (err) {
          console.error("❌ Redis active_room del error:", err);
      }
    });

    socket.on("join_admin_dashboard", async () => {
      // Security: Only ADMIN role users can join the admin dashboard room
      if (!socket.user.role || socket.user.role !== "ADMIN") {
        console.warn(`⚠️ Non-admin user ${currentUserId} attempted to join admin dashboard`);
        return;
      }
      console.log("🛡️ Admin joining dashboard room...");
      socket.join("admin_dashboard_room");

      try {
        // Fetch History from Redis
        const history = await redisClient.lRange("admin:activity_history", 0, 49);
        
        if (history && history.length > 0) {
          const parsedHistory = history.map(item => JSON.parse(item));
          console.log(`📜 Sending ${parsedHistory.length} items history to Admin`);
          socket.emit("activity_history", parsedHistory);
        } else {
          socket.emit("activity_history", []);
          console.log("⚠️ No history found in Redis for Admin");
        }
      } catch (err) {
        console.error("❌ Redis Error fetching history:", err);
      }
    });

    /* ------------------------------------------------------------------ */
    /* 4️⃣ DISCONNECT                                                      */
    /* ------------------------------------------------------------------ */
    socket.on("disconnect", async () => {
      try {
        await redisClient.sRem(`user:sockets:${currentUserId}`, socket.id);
        const remaining = await redisClient.sCard(`user:sockets:${currentUserId}`);
        if (remaining === 0) {
          await redisClient.del(`user:online:${currentUserId}`);
          // 🚀 Arena AI Optimization: Clear active room on total disconnect
          await redisClient.del(`user:active_room:${currentUserId}`);
        }
        console.log("🔌 SOCKET DISCONNECTED:", currentUserId);
      } catch (err) {
        console.error("❌ Disconnect cleanup error:", err);
      }
    });
  });

  adminEvents.on("new_live_activity", async (payload) => {
    const safePayload = {
      ...payload,
      id: payload.id ? payload.id.toString() : Date.now().toString(),
      time: payload.createdAt || new Date().toISOString()
    };

    // 💾 SAVE TO REDIS HISTORY (Capped at 50)
    try {
      await redisClient.lPush("admin:activity_history", JSON.stringify(safePayload));
      await redisClient.lTrim("admin:activity_history", 0, 49);
    } catch (err) {
      console.error("❌ Failed to save to Redis:", err);
    }

    io.to("admin_dashboard_room").emit("new_live_activity", safePayload);
  });
};