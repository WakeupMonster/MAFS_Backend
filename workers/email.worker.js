const { Worker } = require("bullmq");
const utils = require("../modules/auth/auth.utils");
// const {connection} = require("../config/cache")

new Worker(
  "emailQueue",
  async (job) => {
    const { email, otp } = job.data;

    await utils.sendEmail(
      email,
      "Your verification code",
      `Your OTP is ${otp}`
    );

    return { status: "sent" };
  },
  {
    connection: { host: "127.0.0.1", port: 6379 },
      // connection
  }
);

console.log("📧 Email worker running...");
