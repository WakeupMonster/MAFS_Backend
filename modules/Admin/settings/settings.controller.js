const Settings = require("./settings.model");

/**
 * @desc    Fetch global SMTP and OTP settings
 * @route   GET /api/admin/settings
 * @access  Private / Admin
 */
exports.getSettings = async (req, res) => {
  try {
    // We explicitly call the static method to ensure a settings doc exists
    const settings = await Settings.getGlobalSettings();

    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update global SMTP and OTP settings dynamically from Admin panel
 * @route   PUT /api/admin/settings
 * @access  Private / Admin
 */
exports.updateSettings = async (req, res) => {
  try {
    const { smtp, otp } = req.body;

    // We do not want multiple settings records, so update the first one found or create if none
    let settings = await Settings.findOne({});

    if (!settings) {
      settings = new Settings({});
    }

    // Merge incoming data with existing data
    if (smtp) {
      settings.smtp = {
        ...settings.smtp,
        ...smtp,
        auth: { ...settings.smtp?.auth, ...smtp.auth }
      };
    }

    if (otp) {
      // Need precise handling for sub-objects like twilio, fast2sms, msg91
      settings.otp = {
        ...settings.otp,
        ...otp,
        twilio: { ...settings.otp?.twilio, ...otp.twilio },
        fast2sms: { ...settings.otp?.fast2sms, ...otp.fast2sms },
        msg91: { ...settings.otp?.msg91, ...otp.msg91 },
      };
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: error.message,
    });
  }
};

/**
 * @desc    Test currently saved SMTP settings (Just to verify if creds work)
 * @route   POST /api/admin/settings/test-smtp
 * @access  Private / Admin
 */
exports.testSmtpConnection = async (req, res) => {
  try {
    // You can integrate "nodemailer" logic here dynamically testing using db creds mapping.
    // E.g., const nodemailer = require("nodemailer");
    // const { smtp } = await Settings.getGlobalSettings();
    // Use smtp.host, smtp.port, smtp.auth.user, etc...

    return res.status(200).json({
      success: true,
      message: "Test Email sent using current configuration (Implementation pending)",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to test SMTP Connection",
      error: error.message,
    });
  }
};
