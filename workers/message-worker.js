// message-worker.js
const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const ChatMessage = require("../modules/matches/chat/chat.message.model");
const Match = require("./models/Match");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const { Server } = require("socket.io");

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();
const sub = redisClient.duplicate();
await sub.connect();

// Optional: initialize a lightweight io that uses redis adapter so worker can emit
const io = new Server();
io.adapter(createAdapter(redisClient, sub)); // NOTE: no http server needed for adapter usage

const worker = new Worker(
  "message_persist",
  async (job) => {
    const { matchId, from, to, text, media } = job.data;
    // persist
    const msg = await ChatMessage.create({ matchId, from, to, text, media });
    await Match.findByIdAndUpdate(matchId, {
      lastMessageAt: new Date(),
      lastMessagePreview: text?.slice(0, 200) || (media ? "[Media]" : ""),
    });

    // increment unread counter
    await redisClient.incr(`unread:count:${to}`);

    // emit to room (will go across socket instances via redis adapter)
    io.to(`chat:${matchId}`).emit("new_message", msg);

    // also emit to recipient sockets directly (if present)
    const sockets = await redisClient.sMembers(`sockets:${to}`);
    if (sockets && sockets.length) {
      for (const sid of sockets) {
        io.to(sid).emit("new_message", msg);
      }
    }

    // push notification job
    await notificationQueue.add("push", { to, msgId: msg._id });

    return msg;
  },
  { connection: { url: process.env.REDIS_URL } }
);
