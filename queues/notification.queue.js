const { Queue } = require("bullmq");
const { redisClient } = require("../config/cache"); // Aapka existing redis file

const notificationQueue = new Queue("notification-queue", {
  connection: redisClient.options, // BullMQ ko redis ka connection de rahe hain
});

const addNotificationJob = async (type, data) => {
  // Hum job add karte waqt "type" bhejenge (LIKE, MATCH, MESSAGE)
  try {
    await notificationQueue.add(type, data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    });
  } catch (error) {
    console.error("Queue Error:", error);
  }
};

module.exports = { addNotificationJob };
