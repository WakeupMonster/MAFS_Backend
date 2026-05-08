const { uploadStream, destroy } = require("../upload/cloudinary.service");
const AppSettings = require("./appSettings.model");

module.exports.getSocialLinks = async (req, res) => {
  try {
    const setting = await AppSettings.findOne({
      key: "social_links",
    }).lean();

    if (!setting || !Array.isArray(setting.value)) {
      return res.json({
        success: true,
        data: {
          socialMedia: [],
        },
      });
    }

    // only active + sorted
    const socialMedia = setting.value
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        platform: item.platform,
        title: item.title,
        url: item.url,
        icon: item.icon,
      }));

    return res.json({
      success: true,
      message: "Social media links fetched successfully",
      data: {
        socialMedia,
      },
    });
  } catch (err) {
    console.error("Get social links error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load social media links",
    });
  }
};

module.exports.upsertSocialLinks = async (req, res) => {
  try {
    const { socialMedia } = req.body;

    if (!Array.isArray(socialMedia)) {
      return res.status(400).json({
        success: false,
        message: "socialMedia must be an array",
      });
    }

    await AppSettings.findOneAndUpdate(
      { key: "social_links" },
      { value: socialMedia },
      { upsert: true, new: true },
    );

    return res.json({
      success: true,
      message: "Social media links updated successfully",
    });
  } catch (err) {
    console.error("Upsert social links error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update social media links",
    });
  }
};

/*================ GET General Setting ====================*/
module.exports.getGeneralSettings = async (req, res) => {
  try {
    // Database se "general" settings fetch karein
    const settings = await AppSettings.findOne({ key: "general" });

    if (!settings) {
      return res.status(200).json({
        message: "No settings found, returning defaults.",
        data: { value: {} },
      });
    }

    // Format consistent rakhein jaisa Upsert API mein tha
    const data = {
      id: settings._id,
      key: settings.key,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      value: {
        appName: settings.value.appName,
        timezone: settings.value.timezone,
        termsUrl: settings.value.termsUrl,
        privacyUrl: settings.value.privacyUrl,
        playStoreUrl: settings.value.playStoreUrl,
        appStoreUrl: settings.value.appStoreUrl,
        logo: settings.value.logo,
      },
    };

    res.status(200).json({
      success: true,
      message: "General settings fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/*================ UPSERT General Setting ====================*/
module.exports.upsertGeneralSettings = async (req, res) => {
  try {
    const {
      appName,
      timezone,
      termsUrl,
      privacyUrl,
      playStoreUrl,
      appStoreUrl,
      logoUrl: oldLogoUrl, // Existing URL from req.body
    } = req.body;

    let finalLogoUrl = oldLogoUrl;

    // 1. If a new file is uploaded
    if (req.file) {
      // Upload new image to Cloudinary
      const uploadResult = await uploadStream(req.file.buffer, {
        folder: "mustard/logos",
        transformation: [
          { width: 500, height: 500, crop: "limit", quality: "auto" },
        ],
      });

      finalLogoUrl = uploadResult.secure_url;

      // 2. Destroy the old image if it exists
      if (oldLogoUrl && oldLogoUrl.includes("cloudinary")) {
        try {
          const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/;
          const match = oldLogoUrl.match(regex);

          if (match && match[1]) {
            await destroy(match[1]);
          }
        } catch (delError) {
          console.error("Cloudinary Delete Failed:", delError.message);
        }
      }
    }

    const updateData = {
      appName,
      timezone,
      termsUrl,
      privacyUrl,
      playStoreUrl,
      appStoreUrl,
      logo: finalLogoUrl,
    };

    const settings = await AppSettings.findOneAndUpdate(
      { key: "general" },
      { value: updateData },
      { upsert: true, new: true },
    );

    const data = {
      id: settings._id,
      key: settings.key,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      value: {
        appName: settings.value.appName,
        timezone: settings.value.timezone,
        termsUrl: settings.value.termsUrl,
        privacyUrl: settings.value.privacyUrl,
        playStoreUrl: settings.value.playStoreUrl,
        appStoreUrl: settings.value.appStoreUrl,
        logo: finalLogoUrl,
      },
    };

    res.status(200).json({ message: "General settings updated!", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
