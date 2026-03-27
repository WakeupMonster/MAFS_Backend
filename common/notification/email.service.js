const transporter = require("./transporter");

/**
 * Send email using SMTP transporter
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: `"App Team" <${process.env.SMTP_MAIL}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
