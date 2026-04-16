const { getTransporter } = require("./transporter");

/**
 * Send email using SMTP transporter
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const { transporter, fromEmail, fromName } = await getTransporter();

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
