// routes/messages.js
const Message = require("../models/Message");

// GET messages /api/v1/messages/:matchId

exports.getChatMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId } = req.params;

    const messages = await Message.find({ matchId })
      .sort({ createdAt: -1 })
      .lean();

    // return in ascending order to client (older -> newer)
    messages.reverse();

    return res.json({ success: true, data: messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH mark messages read or seen
// PATCH /api/v1/messages/:matchId/read
exports.updateChatMsgRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId } = req.params;

    await Message.updateMany(
      { matchId, to: userId, isRead: false },
      { $set: { isRead: true } }
    );
    // also update Match.lastMessageAt? not necessary here

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
