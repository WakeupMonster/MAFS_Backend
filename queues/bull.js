const { Queue } = require("bullmq");

// const connection = {
//   host: "127.0.0.1",
//   port: 6379,
// };

module.exports = { Queue,   connection: { url: process.env.REDIS_URL || "redis://127.0.0.1:6379" } };
