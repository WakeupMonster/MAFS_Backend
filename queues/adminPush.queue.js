const { Queue } = require("bullmq");
const { connection } = require("./bull");

const adminPushQueue = new Queue("admin-push-queue", { connection });

const addAdminPushJob = async (jobName, payload) => {
  return await adminPushQueue.add(jobName, payload, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
};

module.exports = {
  adminPushQueue,
  addAdminPushJob,
};
