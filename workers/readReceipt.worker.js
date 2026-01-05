// // const { Worker } = require("bullmq");
// // const ChatMessage = require("../modules/matches/chat/chat.message.model");
// // const { connection } = require("../queues/bull");

// // new Worker(
// //   "read-receipt",
// //   async (job) => {
// //     const { matchId, userId } = job.data;

// //     await ChatMessage.updateMany(
// //       { matchId, receiver: userId, status: { $ne: "read" } },
// //       { status: "read", readAt: new Date() }
// //     );

// //     // ques. ask
// //     // global.io use kre ya nhi, prblm production me ati hn local me nhi, solution-> ?
// //     global.io.to(`chat:${matchId}`).emit("messages_read", {
// //       userId,
// //       matchId,
// //     });
// //   },
// //   { connection }
// // );

// // worker/readReceipt.worker.js
// const { Worker } = require("bullmq");
// const ChatMessage = require("../modules/matches/chat/chat.message.model");
// const { connection } = require("../queues/bull");
// const { createClient } = require("redis");

// const redisPub = createClient({ url: process.env.REDIS_URL });
// redisPub.connect();

// new Worker(
//   "read-receipt",
//   async (job) => {
//     const { matchId, userId } = job.data;

//     await ChatMessage.updateMany(
//       { matchId, receiver: userId, status: { $ne: "read" } },
//       { status: "read", readAt: new Date() }
//     );

//     // 🔥 Publish event instead of socket emit
//     await redisPub.publish(
//       "socket-events",
//       JSON.stringify({
//         type: "messages_read",
//         payload: { matchId, userId },
//       })
//     );
//   },
//   { connection }
// );
