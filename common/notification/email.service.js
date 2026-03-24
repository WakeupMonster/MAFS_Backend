const transporter = require("./transporter");

module.exports.sendEmail = async (to, subject, html) => {
  return transporter.sendMail({
    from: process.env.SMTP_MAIL,
    to,
    subject,
    html
  });
};

module.exports = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"App Team" <${process.env.SMTP_MAIL}>`,
    to,
    subject,
    html
  });
};
