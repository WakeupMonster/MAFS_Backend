// require("dotenv").config({ path: "./.env" });
// const { Worker } = require("bullmq");
// const utils = require("../modules/auth/auth.utils");

// const worker = new Worker(
//   "smsQueue",
//   async (job) => {
//     if (job.name === "send-otp") {
//       const { phone, otp } = job.data;
//       await utils.sendSms(phone, `Your code is ${otp}`);
//       console.log("OTP SMS Sent →", phone);
//     }
//   },
//   {
//     connection: { url: process.env.REDIS_URL || "redis://127.0.0.1:6379" }
//   }
// );

// worker.on("completed", (job) => console.log("Job done:", job.id));
// worker.on("failed", (job, err) => console.error("Job failed:", job.id, err));

// require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const { Worker } = require("bullmq");
const utils = require("../modules/auth/auth.utils");
const User = require("../modules/auth/auth.model");
const {connection} = require("../config/cache")

// ------------------------------
// 1. CONNECT MONGODB
// ------------------------------
async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected (Worker)");
  } catch (err) {
    console.error("Worker MongoDB Error:", err);
  }
}
connectMongo();

// ------------------------------
// 2. CREATE WORKER
// ------------------------------
const worker = new Worker("smsQueue", async (job) => {
    if (job.name === "send-otp") {
      const { phone, otp, userId } = job.data;

      // STEP A → Save OTP in DB
      await User.findByIdAndUpdate(userId, {
        phoneOtp: otp,
        phoneOtpExpires: Date.now() + 5 * 60 * 1000
      });

      console.log("OTP stored in DB:", otp);

      // STEP B → Send SMS
      await utils.sendSms(phone, `Your code is ${otp}`);
      console.log("OTP SMS Sent →", phone);
    }
  },
  {
    connection
  }
);

// ------------------------------
// 3. LOG WORKER EVENTS
// ------------------------------
worker.on("completed", (job) => console.log("Job done:", job.id));
worker.on("failed", (job, err) => console.error("Job failed:", job.id, err));
