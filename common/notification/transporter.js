const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Optional but useful in dev
transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP configuration error:", err.message);
  } else {
    console.log("✅ SMTP transporter ready");
  }
});

module.exports = transporter;