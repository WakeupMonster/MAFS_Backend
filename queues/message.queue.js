// const { Queue, connection } = require("./bull");

// const messageQueue = new Queue("message-delivery", {
//   connection,
//   defaultJobOptions: {
//     attempts: 5,
//     backoff: { type: "exponential", delay: 2000 },
//     removeOnComplete: true,
//     removeOnFail: false,
//   },
// });

// module.exports = messageQueue;
