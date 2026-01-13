// socket-server.js
const { Match } = require("../modules/matches/swipe/swipe.model");
const ChatRoom = require("../modules/matches/chat/chat.room.model");
const ChatMessage = require("../modules/matches/chat/chat.message.model");
const messageQueue = require("../queues/message.queue");
const Block = require("../modules/matches/swipe/block.model");

module.exports = (io, redis) => {
  // connection build after match
  io.on("connection", (socket) => {
    console.log("socket🔌 Connected:", socket.id, socket.user._id);

    /*----------client -> server events------------------------*/

    /*----------------------------------------------
        Join chat room for a match  
    ------------------------------------------------*/
    socket.on("join_chat", async ({ matchId }) => {
      try {
        if (!matchId) return;

        const senderUid = socket.user._id;

        // 1️. Validate match exists & belongs to user
        const match = await Match.findById(matchId).lean();
        if (!match) return;

        // 2️. Validate sender is part of match
        const isParticipant = match.users.some(
          (u) => u.toString() === senderUid.toString()
        );

        if (!isParticipant) return;

        // if (!match.users.some((u) => u.toString() === senderUid)) return;

        /* // 3️. Find the other user (receiver)
        // const receiver = match.users.find(
        //   (u) => u.toString() !== senderUid.toString()
        // );

        // // 4️. Check if receiver has blocked sender
        // const isBlocked = await Block.exists({
        //   blocker: receiver,
        //   blocked: senderUid,
        // });

        // if (isBlocked) {
        //   console.log("❌ User is blocked, cannot join chat");
        //   return;
        // }
        */

        // 3️⃣ Leave previous chat rooms
        for (const room of socket.rooms) {
          if (room.startsWith("chat:") && room !== `chat:${matchId}`) {
            socket.leave(room);
          }
        }

        // 5. Mark active in Redis (Expires in 1hr of inactivity)
        await redis.set(`active_room:${senderUid}`, matchId, "EX", 3600);

        // 6. Join socket room (anti-spam)
        const room = `chat:${matchId}`;
        if (!socket.rooms.has(room)) {
          socket.join(room);
        }

        // 7. Clear Unread Count & Update message statuses to "read"
        await ChatRoom.findOneAndUpdate(
          { matchId },
          {
            $addToSet: { activeUsers: senderUid },
            $set: { [`unreadCount.${senderUid}`]: 0 },
          },
          { upsert: true, new: true }
        );

        // 8. Notify the sender that their messages were read
        socket.to(room).emit("messages_read", {
          matchId,
          readerId: senderUid,
          readAt: new Date(),
        });
      } catch (err) {
        console.error("join_chat error:", err);
      }
    });

    /*----------------------------------------------
        Leave chat room
    -----------------------------------------------*/
    socket.on("leave_chat", ({ matchId }) => {
      if (!matchId) return;
      const room = `chat:${matchId}`;
      socket.leave(room);
    });

    /*----------------------------------------------
        start typing indicators
    ------------------------------------------------*/
    socket.on("typing", ({ matchId }) => {
      // Without matchId → server crashes
      if (!matchId) return;

      // This typing:start event trigger when both users are activly and chat 1:1 or instantly or real-time
      socket
        .to(`chat:${matchId}`)
        .emit("typing", { sender: socket.user._id, matchId });
    });

    /*----------------------------------------------
        stop typing indicators
    -----------------------------------------------*/
    socket.on("stop_typing", ({ matchId }) => {
      if (!matchId) return;
      // This typing:stop event trigger. jab user A typing stop kr dega then user B receive side se remove hojaye ga indicator.
      socket
        .to(`chat:${matchId}`)
        .emit("stop_typing", { sender: socket.user._id, matchId });
    });

    /*----------------------------------------------
        send message  // tempry id // Apply Ack for Acknowledge
    ------------------------------------------------*/
    socket.on("send_message", async (payload, ack) => {
      try {
        const sender = socket.user._id;
        const { matchId, receiver, text, media = [], clientTempId } = payload;

        // validate match id and reveive id
        if (!matchId || !receiver) {
          return ack({
            success: false,
            error: "Invalid payload",
          });
        }

        // 1️⃣ 🔐 sender + receiver match dono match users hai ya nhi hn
        const match = await Match.findById(matchId).lean();

        if (
          !match ||
          !match.users.some((u) => u.toString() === sender.toString()) ||
          !match.users.some((u) => u.toString() === receiver.toString())
        ) {
          if (typeof ack === "function") {
            return ack({
              success: false,
              error: "Unauthorized message",
            });
          }
          return;
        }

        // 2️⃣ 🔥 BLOCK CHECK (CRITICAL) -> check user block hn ya nhi hn
        const isBlocked = await Block.exists({
          blocker: receiver, // User A
          blocked: sender, // User B
        });

        if (isBlocked) {
          if (typeof ack === "function") {
            return ack({
              success: false,
              error: "You cannot message this user",
              code: "USER_BLOCKED",
            });
          }
          return;
        }

        // 3️⃣ Save message krega DB me
        const msg = await ChatMessage.create({
          matchId,
          sender,
          receiver,
          text: text || "",
          media: Array.isArray(media) ? media : [],
          status: "sent",
        });

        await ChatRoom.findOneAndUpdate(
          { matchId },
          {
            $set: {
              lastMessage: {
                text: msg.text || (msg.media.length ? "📎 Media" : ""),
                sender: sender,
                lastMessageAt: msg.createdAt,
              },
            },
            $inc: {
              [`unreadCount.${receiver}`]: 1,
            },
            $setOnInsert: {
              participants: [sender, receiver],
            },
          },
          { upsert: true }
        );

        // 4️⃣ Update match -> last message ko match me update krega
        await Match.findByIdAndUpdate(matchId, {
          lastMessageAt: new Date(),
        });

        // 5️⃣ Stop typing indicator
        socket.to(`chat:${matchId}`).emit("stop_typing", {
          sender,
          matchId,
        });

        console.log("pass msg into queue: ", msg);

        // 6️⃣ Push job into queue 🔥 -> Bullq or Havily task ke liye mesg que me push kr dega
        await messageQueue.add("message-delivery", {
          msgId: msg._id.toString(),
          matchId: matchId.toString(),
          receiver: receiver.toString(),
        });

        // 7️⃣ ACK to sender success response 🔥
        ack({
          success: true,
          clientTempId, // map temp → real
          data: msg,
        });
      } catch (err) {
        console.error("send_message error:", err);

        // 8️⃣ ACK failure response
        ack({
          success: false,
          error: "Message send failed",
        });
      }
    });

    /*----------------------------------------------
        Disconnect user is offline
    ------------------------------------------------*/
    socket.on("disconnect", async () => {
      // remove socket id from redis set
      if (socket.user?._id) {
        await redis.sRem(`sockets:${socket.user._id}`, socket.id);
      }
    });
  });
};

// Server to client events
// match: creation; chat: message; chat: delivered; chat:read, chat: pending messages;
