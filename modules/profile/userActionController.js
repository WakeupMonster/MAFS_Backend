const Block = require("./user.block");
const Report = require("./user.report");
const Profile = require("./profile.model")

// --- Actions ---

// 1. Block User (URL Param se ID lega - Easy for Frontend)
exports.blockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const actorId = req.user._id;

    if (actorId.toString() === targetId) return res.status(400).json({ success: false, message: "Self-block not allowed" });

    await Block.findOneAndUpdate(
      { blockerId: actorId, blockedId: targetId },
      { blockerId: actorId, blockedId: targetId },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: "User blocked successfully" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// 2. Report User (URL Param se ID + Body se Reason)
exports.reportUser = async (req, res) => {
  try {
    const { reason, description } = req.body;
    await Report.create({
      reporterId: req.user._id,
      reportedId: req.params.id,
      reason,
      description
    });
    res.status(201).json({ success: true, message: "Report submitted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// 3. Get Blocked Users (Figma Design Format)

exports.getBlockList = async (req, res) => {
  console.log("enter")
  try {
    const myId = req.user._id; // Anubhav ki ID (6953b15de877bc37d35435e3)
    console.log(myId,"myId")

    // 1. Un logo ki IDs nikalo jinhe Anubhav ne block kiya hai
    const blocks = await Block.find({ blockerId: myId }).select("blockedId");

    if (!blocks.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // 2. Sirf blocked users ki IDs ka ek array banao
    const blockedUserIds = blocks.map(b => b.blockedId);

    // 3. Un blocked logo ki profiles fetch karo (Anubhav ki nahi)
    const profiles = await Profile.find({ 
      userId: { $in: blockedUserIds } 
    }).select("userId nickname dob photos location about").lean();

    // 4. Figma ke liye data format karo
    const formattedData = profiles.map(p => ({
      id: p.userId,
      name: p.nickname || "User",
      age: p.dob ? Math.floor((new Date() - new Date(p.dob)) / 31557600000) : 25,
      distance: "7 km away", // Calculation logic yahan add kar sakte ho
      image: p.photos && p.photos.length > 0 ? p.photos[0].url : ""
    }));

    // 5. Final Professional Response
    return res.status(200).json({
      success: true,
      title: `Blocked Users (${formattedData.length})`,
      data: formattedData // Yeh ab Array aayega
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching list" });
  }
};

// 4. Unblock User (URL Param)
exports.unblockUser = async (req, res) => {
  try {
    await Block.findOneAndDelete({ blockerId: req.user._id, blockedId: req.params.id });
    res.status(200).json({ success: true, message: "User unblocked" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};