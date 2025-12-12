// socket-server.js
const User = require("../modules/auth/auth.model");
const { Match } = require("../modules/matches/swipe/swipe.model");
const ChatRoom = require("../modules/matches/chat/chat.room.model");
const ChatMessage = require("../modules/matches/chat/chat.message.model");
const { sendNotification } = require("../modules/notifications/firebase-admin");

module.exports = (io, redis) => {
  // connection build after match
  io.on("connection", (socket) => {
    console.log("socket connected", socket.id, socket.user._id);

    // client -> server events
    // Join chat room for a match
    socket.on("join_chat", async ({ matchId }) => {
      try {
        if (!match) return;

        const userId = socket.user._id;

        // 1️⃣ Validate match exists & belongs to user
        const match = await Match.findById(matchId).lean();
        if (!match.users.some((u) => u.toString() === userId.toString())) {
          return; // not part of match
        }

        // 2️⃣ Create or update chat room
        const chatRoom = await ChatRoom.findOneAndUpdate(
          { matchId },
          { $addToSet: { participants: userId } }, // add only if not exists
          { upsert: true, new: true }
        );

        // 3️⃣ Join socket room
        socket.join(`chat:${matchId}`);

        // 4️⃣ Notify other participant
        socket.to(`chat:${matchId}`).emit("user_joined", {
          userId,
          roomId: chatRoom._id,
        });
      } catch (err) {
        console.error("join_chat error:", err);
      }
    });

    // Leave chat room
    socket.on("leave_chat", ({ matchId }) => {
      if (!matchId) return;
      const room = `chat:${matchId}`;
      socket.leave(room);
    });

    // start typing indicators
    socket.on("typing", ({ matchId }) => {
      // Without matchId → server crashes
      if (!matchId) return;

      // This typing:start event trigger when both users are activly and chat 1:1 or instantly or real-time
      socket
        .to(`chat:${matchId}`)
        .emit("typing", { sender: socket.user._id, matchId });
    });

    // stop typing indicators
    socket.on("stop_typing", ({ matchId }) => {
      if (!matchId) return;
      // This typing:stop event trigger. jab user A typing stop kr dega then user B receive side se remove hojaye ga indicator.
      socket
        .to(`chat:${matchId}`)
        .emit("stop_typing", { sender: socket.user._id, matchId });
    });

    // send message  // tempry id
    socket.on("send_message", async (payload) => {
      try {
        // send mesg from sender side.
        const sender = socket.user._id;
        const { matchId, receiver, text, media } = payload;

        if (!matchId || !receiver) return;

        // 1️⃣ Save message. This msg data save to DB from sender side.
        const msg = await ChatMessage.create({
          matchId,
          sender,
          receiver,
          text: text || "",
          media: media || null,
        });

        // Update last msg date in match schema from sender side and save DB
        await Match.findByIdAndUpdate(matchId, { lastMessageAt: new Date() });

        // 3️⃣ Stop typing automatically jese hi message sent hua
        socket.to(`chat:${matchId}`).emit("stop_typing", { sender, matchId });

        // 4️⃣ This Emit to room event trigger.
        // Jab ⚠️ Room me join kiya hua user hi realtime receive karega.
        io.to(`chat:${matchId}`).emit("new_message", msg);

        // 5️⃣ Detect if receiver is already inside the chat room
        const roomSockets = await io.in(`chat:${matchId}`).fetchSockets();
        const isReceiverInRoom = roomSockets.some(
          (s) => s.user._id.toString() === receiver.toString()
        );

        // 6️⃣ Emit direct message only if receiver has sockets OUTSIDE chat room.
        if (!isReceiverInRoom) {
          const recipientSockets = await redis.sMembers(`sockets:${receiver}`);

          if (recipientSockets?.length) {
            for (const sid of recipientSockets) {
              if (sid !== socket.id) io.to(sid).emit("new_message", msg);
            }
          }
        }

        // 7️⃣ Send push notification only if receiver NOT active in chat room
        if (!isReceiverInRoom) {
          const recipient = await User.findById(receiver).lean();

          if (recipient?.fcmTokens?.length) {
            // sendFCM dummy hn abhi ke liye

            for (const tkObj of recipient.fcmTokens) {
              await sendNotification(
                tkObj.token,
                {
                  title: "New message",
                  body: msg.text || "Photo",
                },
                {
                  type: "NEW_MESSAGE",
                  matchId: matchId.toString(),
                }
              );
            }
          }
        }
      } catch (err) {
        console.error("send_message err", err);
        socket.emit("error", { message: err.message });
      }
    });

    // Server to client events
    // match: creation; chat: message; chat: delivered; chat:read, chat: pending messages;
    socket.on("disconnect", async () => {
      // remove socket id from redis set
      await redis.sRem(`sockets:${socket.user._id}`, socket.id);
    });
  });
};
