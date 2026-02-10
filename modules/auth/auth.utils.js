const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
let twilioClient = null;

// Optional: init Twilio lazily
function initTwilio() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  const twilio = require("twilio");
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  return twilioClient;
}

module.exports.generateOtp = () => {
  return "" + Math.floor(100000 + Math.random() * 900000); // 6-digit string
};

module.exports.hashOtp = async (otp) => {
  // bcrypt to hash short OTP
  return bcrypt.hash(otp, 10);
};

module.exports.verifyOtpHash = async (otp, hash) => {
  if (!hash) return false;
  return bcrypt.compare(otp, hash);
};

module.exports.passwordHashed = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

module.exports.passwordCompared = async (password, comparePwd) => {
  return bcrypt.compare(password, comparePwd);
};

module.exports.hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports.generateRefreshToken = () => {
  return crypto.randomBytes(48).toString("hex");
};

module.exports.generateAccessToken = (user) => {
  const payload = { userId: user._id.toString(), role: user.role };
  // const expiresIn = user.role === "ADMIN" ? "30d" : "7d";
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15d" });
};

module.exports.REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;
module.exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
};

module.exports.hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports.sendSms = async (to, message) => {
  const client = initTwilio();

  if (!client) {
    // No Twilio configured — log and return
    console.warn("Twilio not configured. SMS not sent:", to, message);

    return { ok: false, info: "twilio-not-configured" };
  }
  const from = process.env.TWILIO_FROM; // must be configured

  return client.messages.create({ body: message, from, to });
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

module.exports.sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to,
      subject,
      html: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Mail sent:", info.messageId);
    console.log("Sent to:", to);

    return { ok: true, info };
  } catch (error) {
    console.log("SMTP Error:", error.message);
    throw new Error("Email sending failed");
  }
};

module.exports.passwordCompared = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
module.exports.passwordHashed = async (plainPassword) => {
  return bcrypt.hash(plainPassword, 10);
};
module.exports.sendPrizeDeliveredEmail = async (toEmail, prizeTitle) => {
  await transporter.sendMail({
    from: '"Giveaway Team" <no-reply@app.com>',
    to: toEmail,
    subject: "🎉 Your Giveaway Prize is Delivered!",
    html: `
      <h2>Congratulations 🎉</h2>
      <p>Your prize <b>${prizeTitle}</b> has been successfully delivered.</p>
      <p>Thank you for participating!</p>
    `
  });
};


module.exports.sendReplyToReporterEmail = async ({
  to,
  reporterName,
  reportedUserName,
  reportReason,
  adminReply,
  reportDate
}) => {
  try {
    const subject = "Update on your reported profile";

    const html = `
      <p>Hi ${reporterName},</p>

      <p>Thank you for reporting the profile <b>${reportedUserName}</b>.</p>

      <p><b>Report Reason:</b> ${reportReason}</p>
      <p><b>Report Date:</b> ${new Date(reportDate).toDateString()}</p>

      <hr />

      <p><b>Admin Reply:</b></p>
      <p>${adminReply}</p>

      <br />
      <p>Regards,<br/>Admin Team</p>
    `;

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Mail sent:", info.messageId);
    console.log("Sent to:", to);

    return { ok: true, info };
  } catch (error) {
    console.log("SMTP Error:", error.message);
    throw new Error("Email sending failed");
  }
};




// module.exports.sendEmail = async (to, subject, text) => {

//   // nodemailer using Google SMTP (or any SMTP configured in env)
//   if (!process.env.SMTP_HOST) {
//     console.warn("SMTP not configured. Email not sent:", to, subject);
//     return { ok: false, info: "smtp-not-configured" };
//   }

//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT || 587),
//     secure: process.env.SMTP_SECURE === "true", // true for 465
//     auth: {
//       user: process.env.SMTP_FROM,
//       pass: process.env.SMTP_PASS,
//     },
//   });

//   const info = await transporter.sendMail({
//     from: process.env.SMTP_FROM,
//     to,
//     subject,
//     text,
//   });

//   return info;
// };
