const { getTwilioClient } = require("./twilio");

module.exports.sendSms = async (to, message) => {
  const client = getTwilioClient();
  if (!client) return;
console.log("sending sms from new file")
  return client.messages.create({
    from: process.env.TWILIO_FROM,
    to,
    body: message
  });
};