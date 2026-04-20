const nodemailer = require("nodemailer");
const Settings = require("../../modules/Admin/settings/settings.model");

const getTransporter = async () => {
  const settings = await Settings.getGlobalSettings();
  const smtp = settings.smtp;

  // If DB host is missing, we consider SMTP unconfigured in Admin Panel
  // and fall back entirely to .env for all parameters.
  const useDb = !!smtp?.host;

  const host = useDb ? smtp.host : process.env.SMTP_HOST;
  const user = useDb ? smtp.auth?.user : process.env.SMTP_MAIL;
  const pass = useDb ? smtp.auth?.pass : process.env.SMTP_PASSWORD;
  
  // Port fallback logic
  const port = useDb ? smtp.port : (process.env.SMTP_PORT || 465);
  
  // Secure logic: 
  // 1. If DB: use DB secure value.
  // 2. If fallback to .env: check SMTP_SECURE string or auto-detect based on port 465.
  const secure = useDb 
    ? (smtp.secure !== undefined ? smtp.secure : true) 
    : (process.env.SMTP_SECURE === "true" || port == 465);

  const transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(port),
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