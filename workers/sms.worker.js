require("dotenv").config({ path: "./.env" });
const { Worker } = require("bullmq");
const utils = require("../modules/auth/auth.utils");

// ------------------------------
// CREATE WORKER
// ------------------------------
// OTP verification is Redis-hash based (see common/otp/otp.service.js) —
// this worker's only job is the actual SMS dispatch, no DB writes needed.
const worker = new Worker(
  "smsQueue",
  async (job) => {
    if (job.name === "send-otp") {
      const { phone, message } = job.data;
      await utils.sendSms(phone, message);
      console.log("OTP SMS Sent →", phone);
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
    },
  }
);

// ------------------------------
// LOG WORKER EVENTS
// ------------------------------
worker.on("completed", (job) => console.log("Job done:", job.id));
worker.on("failed", (job, err) => console.error("Job failed:", job.id, err));

module.exports = worker;
