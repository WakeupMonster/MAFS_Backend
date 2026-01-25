const { Queue } = require('bullmq');
const emailQueue = new Queue(
  "admin-email-queue",
  process.env.REDIS_URL
);

module.exports = emailQueue;