const AppSettings = require("./appSettings.model");

module.exports.getSocialLinks = async (req, res) => {
  try {
    const setting = await AppSettings.findOne({
      key: "social_links"
    }).lean();

    if (!setting || !Array.isArray(setting.value)) {
      return res.json({
        success: true,
        data: {
          socialMedia: []
        }
      });
    }

    // only active + sorted
    const socialMedia = setting.value
      .filter(item => item.isActive)
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        platform: item.platform,
        title: item.title,
        url: item.url,
        icon: item.icon
      }));

    return res.json({
      success: true,
      data: {
        socialMedia
      }
    });

  } catch (err) {
    console.error("Get social links error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load social media links"
    });
  }
};



module.exports.upsertSocialLinks = async (req, res) => {
  try {
    const { socialMedia } = req.body;

    if (!Array.isArray(socialMedia)) {
      return res.status(400).json({
        success: false,
        message: "socialMedia must be an array"
      });
    }

    await AppSettings.findOneAndUpdate(
      { key: "social_links" },
      { value: socialMedia },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: "Social media links updated successfully"
    });

  } catch (err) {
    console.error("Upsert social links error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update social media links"
    });
  }
};
