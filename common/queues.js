const { Queue } = require("bullmq");

const smsQueue = new Queue("smsQueue", {
  connection: { url: process.env.REDIS_URL || "redis://127.0.0.1:6379" }
});

const emailQueue = new Queue("emailQueue", {
  connection: { url: process.env.REDIS_URL || "redis://127.0.0.1:6379" }
});

module.exports = { smsQueue,emailQueue };