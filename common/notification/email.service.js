const transporter = require("./transporter");

exports.sendEmail = async (to, subject, html) => {
  return transporter.sendMail({
    from: process.env.SMTP_MAIL,
    to,
    subject,
    html
  });
};