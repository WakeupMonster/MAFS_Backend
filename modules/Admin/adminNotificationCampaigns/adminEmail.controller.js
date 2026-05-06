const AdminEmailCampaign = require("./adminEmailCampaign.model");
const emailQueue = require("../../../queues/email.queue");
const EmailLog = require("./emailLog.model");

module.exports.createEmailCampaign = async (req, res) => {
  try {
    const adminId = req.user._id;
    console.log(adminId, "adminId")
    console.log("📩 Received Email Campaign Request:", req.body);
    const { campaignName, subject, title, body, message, target } = req.body;

    const finalSubject = subject || title;
    const finalBody = body || message;

    if (!campaignName || !finalSubject || !finalBody || !target) {
      console.log("⚠️ Missing fields. Found:", { campaignName, finalSubject, finalBody, target });
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const campaign = await AdminEmailCampaign.create({
      campaignName,
      subject: finalSubject,
      body: finalBody,
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
  }
  catch (err) {
    console.error("❌ sending email campaign  error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send email campaign",
    });
  }
};

module.exports.getEmailCampaignLogs = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const logs = await EmailLog.find({ campaignId })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error("❌ getEmailCampaignLogs error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email logs",
    });
  }
};
