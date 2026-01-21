const bcrypt = require("bcryptjs");
const { transporter } = require("../../../config/nodemailer");

module.exports.sendEmail = async (to, subject, html) => {
  try {
    // 1. Verify environment variables are present
    if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
      console.warn("SMTP credentials missing. Email not sent.");
      return { success: false, message: "email-config-missing" };
    }

    const mailOptions = {
      from: `Mafs Admin support <${process.env.SMTP_MAIL}>`, // Clean sender name
      to,
      subject,
      html,
    };

    // 2. Send the mail
    const info = await transporter.sendMail(mailOptions);
    console.log("Mail sent:", info.messageId);
    console.log("Sent to:", to);

    console.log(`📧 Email sent successfully to ${to}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, data: info };
  } catch (error) {
    console.error("❌ SMTP Error:", error);

    // We throw an AppError so the global error handler can catch it
    throw new console.log("Failed to send email. Please try again later.", 500);
  }
};

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