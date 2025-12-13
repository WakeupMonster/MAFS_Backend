// routes/messages.js
const ChatMessage = require("../chat/chat.message.model");
const { Match } = require("../swipe/swipe.model");

// GET /api/v1/messages/:matchId
// exports.getChatMessages = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { matchId } = req.params;

//     console.log("matchId: ", matchId);

//     // 1. Check if match exists
//     const match = await Match.findById(matchId).lean();
//     if (!match) {
//       return res.status(404).json({ success: false, message: "Match not found" });
//     }

//     // 2. Check if this user is part of the match
//       if ( match.user1.toString() !== userId.toString() && match.user2.toString() !== userId.toString() ) {
//       return res.status(403).json({ success: false, message: "Forbidden — You are not part of this match" });
//     }

//     // 3. Fetch ordered messages
//     const messages = await ChatMessage.find({ matchId })
//       .sort({ createdAt: 1 })
//       .lean();

//     return res.json({ success: true, message:"Fetch All message", data: messages });
//   } catch (err) {
//     console.error("GET CHAT MESSAGES ERROR:", err);

//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// GET /api/v1/messages/:matchId?limit=20&page=1
exports.getChatMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    console.log("matchId:", matchId);
    console.log("userId: ", userId.toString());

    // 1. Check match exist
    const match = await Match.findById(matchId).lean();

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // 2. Check if user is part of the match
    if (!match.users.some((u) => u.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You are not part of this match",
      });
    }

    const skip = (page - 1) * limit;
    // 3. Fetch messages
    const messages = await ChatMessage.find({
      matchId,
      deletedFor: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // return in ascending order to client (older -> newer) # check this reverse logic
    messages.reverse();

    return res.json({
      success: true,
      message: "Fetched all messages",
      data: messages,
    });
  } catch (err) {
    console.error("GET CHAT MESSAGES ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/v1/messages/:matchId/read   // mark messages read or seen
exports.updateChatMsgRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId } = req.params;

    // 1. Ensure match exists
    const match = await Match.findById(matchId).lean();
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // 2. Ensure user is part of the match
    if (!match.users.some((u) => u.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You are not part of this match",
      });
    }

    // 3. Update unread messages where receiver = userId
    const result = await ChatMessage.updateMany(
      { matchId, receiver: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.json({ success: true, readCount: result.modifiedCount });
  } catch (err) {
    console.error("ERROR updating chat read status:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /api/v1/messages/:matchId/:messageId
exports.deleteChatMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId, messageId } = req.params;

    console.log("matchId:", matchId);
    console.log("messageId:", messageId);
    console.log("userId:", userId.toString());

    // 1) Validate match
    const match = await Match.findById(matchId).lean();
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // Check user is part of this match
    if (!match.users.some((u) => u.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You are not part of this match",
      });
    }

    // 2) Validate message
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // Ensure message belongs to this match
    if (message.matchId.toString() !== matchId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Message does not belong to this match",
      });
    }

    // 3) Perform soft delete for this user
    const delUpdate = await ChatMessage.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedFor: userId } },
      { new: true }
    ).lean();

    return res.json({
      success: true,
      message: "Message deleted for user",
      data: delUpdate,
    });
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
