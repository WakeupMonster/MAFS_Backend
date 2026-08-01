const { Queue } = require("bullmq");

// ioredis (which BullMQ uses under the hood) only parses a `url` from a
// connection STRING, not from a property inside an options object — passing
// {url: "..."} here was silently ignored and ioredis fell back to its own
// default (localhost:6379, no auth), same bug pattern as queues/notification.queue.js.
const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const smsQueue = new Queue("smsQueue", {
  connection: redisConnection
});

const emailQueue = new Queue("emailQueue", {
  connection: redisConnection
});

module.exports = { smsQueue, emailQueue };