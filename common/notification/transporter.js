const nodemailer = require("nodemailer");
const Settings = require("../../modules/Admin/settings/settings.model");

const getTransporter = async () => {
  const settings = await Settings.getGlobalSettings();
  const smtp = settings.smtp;

  // Priority: Database > .env
  const host = smtp?.host || process.env.SMTP_HOST;
  const user = smtp?.auth?.user || process.env.SMTP_MAIL;
  const pass = smtp?.auth?.pass || process.env.SMTP_PASSWORD;
  const port = smtp?.port || process.env.SMTP_PORT || 465;
  const secure = smtp?.secure !== undefined ? smtp.secure : true;

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass,
    },
  });

  return {
    transporter,
    fromEmail: smtp?.fromEmail || user,
    fromName: smtp?.fromName || "App Team"
  };
};

module.exports = { getTransporter };