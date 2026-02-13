const AdminEmailCampaign = require("./adminEmailCampaign.model");
const emailQueue = require("../../../queues/email.queue");

module.exports.createEmailCampaign = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { campaignName, subject, body, target } = req.body;

    if (!campaignName || !subject || !body || !target) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const campaign = await AdminEmailCampaign.create({
      campaignName,
      subject,
      body,
      target,
      createdBy: adminId,
    });

    await emailQueue.add("send_campaign_email", {
      campaignId: campaign._id,
    });

    return res.json({
      success: true,
      message: "Email campaign queued successfully",
      campaignId: campaign._id,
    });
  } catch (err) {
    console.error("❌ Email campaign error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create email campaign",
    });
  }
};
