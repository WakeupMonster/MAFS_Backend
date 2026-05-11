const Settings = require("./settings.model");
const AdsConfiguration = require("../../AppConfiguration/adsConfig.model");
const cache = require("../../../config/cache");

const REDIS_KEY = "ads_config_data";

// Helper to format configurations into the standardized JSON response
const formatConfigs = (configs) => {
  const formattedData = {
    android: {
      app_open: { id: "", active: false },
      interstitial: { id: "", active: false, click_limit: 5 },
      native: { id: "", active: false, n_item: 25 },
    },
    ios: {
      app_open: { id: "", active: false },
      interstitial: { id: "", active: false, click_limit: 5 },
      native: { id: "", active: false, n_item: 25 },
    },
  };

  configs.forEach((config) => {
    if (config.platform === "android" || config.platform === "ios") {
      formattedData[config.platform] = {
        app_open: config.app_open || formattedData[config.platform].app_open,
        interstitial:
          config.interstitial || formattedData[config.platform].interstitial,
        native: config.native || formattedData[config.platform].native,
      };
    }
  });

  return formattedData;
};

// Helper to get formatted ads configuration with caching
const getFormattedAdsConfig = async () => {
  try {
    // 1. Try to get data from Cache
    const cachedData = await cache.get(REDIS_KEY);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. If not in cache, fetch from Database
    const configs = await AdsConfiguration.find().lean();
    const formattedData = formatConfigs(configs);

    // 3. Save to cache before returning
    await cache.set(REDIS_KEY, JSON.stringify(formattedData));

    return formattedData;
  } catch (error) {
    console.error("Error in getFormattedAdsConfig:", error);
    throw error;
  }
};


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
        auth: { ...settings.smtp?.auth, ...smtp.auth },
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
    const {
      getTransporter,
    } = require("../../../common/notification/transporter");
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

module.exports.upsertAdsSettings = async (req, res) => {
  try {
    const { platform, app_open, interstitial, native } = req.body;
    const adminId = req.user._id;

    if (!platform || !["android", "ios"].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing platform. Must be 'android' or 'ios'.",
      });
    }

    const updateData = {
      updatedBy: adminId,
    };

    // Use dot notation to allow partial updates of nested objects without erasing existing fields
    if (app_open) {
      if (app_open.id !== undefined) updateData["app_open.id"] = app_open.id;
      if (app_open.active !== undefined)
        updateData["app_open.active"] = app_open.active;
    }

    if (interstitial) {
      if (interstitial.id !== undefined)
        updateData["interstitial.id"] = interstitial.id;
      if (interstitial.active !== undefined)
        updateData["interstitial.active"] = interstitial.active;
      if (interstitial.click_limit !== undefined)
        updateData["interstitial.click_limit"] = parseInt(
          interstitial.click_limit,
        );
    }

    if (native) {
      if (native.id !== undefined) updateData["native.id"] = native.id;
      if (native.active !== undefined)
        updateData["native.active"] = native.active;
      if (native.n_item !== undefined)
        updateData["native.n_item"] = parseInt(native.n_item);
    }

    // Upsert configuration for specific platform
    const config = await AdsConfiguration.findOneAndUpdate(
      { platform: platform },
      { $set: updateData },
      { upsert: true, new: true, runValidators: true },
    );

    // After update, fetch all configs and refresh cache
    const allConfigs = await AdsConfiguration.find().lean();
    const formattedData = formatConfigs(allConfigs);

    await cache.set(REDIS_KEY, JSON.stringify(formattedData));

    return res.json({
      success: true,
      message: `Ads configuration for ${platform} updated successfully.`,
      data: config,
    });
  } catch (error) {
    console.error("Error upserting Ads Config:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ads configurations",
      error: error.message,
    });
  }
};

module.exports.getAdsSettings = async (req, res) => {
  try {
    const formattedData = await getFormattedAdsConfig();

    return res.json({
      success: true,
      message: "Ads configurations fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching Ads Config:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ads configurations",
    });
  }
};