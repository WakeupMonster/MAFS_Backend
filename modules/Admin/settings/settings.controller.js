const Settings = require("./settings.model");

/**
 * @desc    Fetch global SMTP and OTP settings
 * @route   GET /api/admin/settings
 * @access  Private / Admin
 */
exports.getSettings = async (req, res) => {
  try {
    // We explicitly call the static method to ensure a settings doc exists
    const settings = (await Settings.getGlobalSettings()).toObject();

    // Security: Mask sensitive credentials so they aren't exposed in cleartext to the browser
    if (settings.smtp?.auth?.pass) settings.smtp.auth.pass = "********";
    if (settings.otp?.twilio?.authToken) settings.otp.twilio.authToken = "********";
    if (settings.otp?.fast2sms?.apiKey) settings.otp.fast2sms.apiKey = "********";
    if (settings.otp?.msg91?.authKey) settings.otp.msg91.authKey = "********";

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

exports.testSmtpConnection = async (req, res) => {
  try {
    const { getTransporter } = require("../../../common/notification/transporter");
    // Fetch live configuration
    const { transporter, fromEmail, fromName } = await getTransporter();

    // 1. Verify connection credentials
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error("Test SMTP Verification Error: ", error.message);
          return reject(error);
        }
        resolve(success);
      });
    });

    // 2. Optionally, we can send a test email to the configured fromEmail (or admin user)
    // Here we'll send it back to the sender itself as proof of life.
    const testToEmail = req.user.email || fromEmail;

    if (testToEmail) {
      await transporter.sendMail({
        from: `"${fromName} (Test)" <${fromEmail}>`,
        to: testToEmail,
        subject: "Test SMTP Email - WakeupMonster",
        text: "If you received this email, your database SMTP configuration is working perfectly!",
      });
    }

    return res.status(200).json({
      success: true,
      message: `SMTP Connection Successful. A test email has been sent to ${testToEmail}.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to test SMTP Connection. Please check your credentials.",
      error: error.message,
    });
  }
};
