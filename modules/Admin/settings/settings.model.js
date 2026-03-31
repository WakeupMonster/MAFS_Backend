const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // SMTP Configuration
    smtp: {
      provider: {
        type: String,
        enum: ["GMAIL", "SENDGRID", "AWS_SES", "CUSTOM"],
        default: "CUSTOM",
      },
      host: {
        type: String,
        trim: true,
      },
      port: {
        type: Number,
        default: 465,
      },
      secure: {
        type: Boolean,
        default: true,
      },
      auth: {
        user: {
          type: String,
          trim: true,
        },
        pass: {
          type: String, // Store securely or encrypted if required
        },
      },
      fromEmail: {
        type: String,
        trim: true,
      },
      fromName: {
        type: String,
        trim: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },

    // OTP Service Configuration
    otp: {
      provider: {
        type: String,
        enum: ["TWILIO", "FAST2SMS", "MSG91", "FIREBASE"],
        default: "TWILIO",
      },
      // Settings specific to Twilio
      twilio: {
        accountSid: { type: String, trim: true },
        authToken: { type: String, trim: true },
        fromNumber: { type: String, trim: true },
      },
      // Settings specific to Fast2SMS
      fast2sms: {
        apiKey: { type: String, trim: true },
        senderId: { type: String, trim: true },
      },
      // Settings specific to MSG91
      msg91: {
        authKey: { type: String, trim: true },
        senderId: { type: String, trim: true },
        templateId: { type: String, trim: true },
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// We usually need only one settings document for the whole system.
// This static method helps in getting or initializing that single document.
settingsSchema.statics.getGlobalSettings = async function () {
  let settings = await this.findOne({});
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
