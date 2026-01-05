/* eslint-disable no-unused-vars */
// routes/messages.js


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

// const ChatMessage = require("../chat/chat.message.model");
// const { Match } = require("../swipe/swipe.model");
// exports.getChatMessages = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { matchId } = req.body;
//     const limit = Math.min(parseInt(req.query.limit) || 20, 100);
//     const page = Math.max(parseInt(req.query.page) || 1, 1);

//     console.log("matchId:", matchId);
//     console.log("userId: ", userId.toString());

//     // 1. Check match exist
//     const match = await Match.findById(matchId).lean();

//     if (!match) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Match not found" });
//     }

//     // 2. Check if user is part of the match
//     if (!match.users.some((u) => u.toString() === userId.toString())) {
//       return res.status(403).json({
//         success: false,
//         message: "Forbidden — You are not part of this match",
//       });
//     }

//     const skip = (page - 1) * limit;
//     // 3. Fetch messages
//     const messages = await ChatMessage.find({
//       matchId,
//       deletedFor: { $ne: userId },
//     })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // return in ascending order to client (older -> newer) # check this reverse logic
//     messages.reverse();

//     return res.json({
//       success: true,
//       message: "Fetched all messages",
//       data: messages,
//     });
//   } catch (err) {
//     console.error("GET CHAT MESSAGES ERROR:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };



const ChatMessage = require("./chat.message.model");
const { Match } = require("../swipe/swipe.model");

// 1. SEND MESSAGE (Sabse important jo missing tha)
exports.sendMessage = async (req, res) => {
  try {
    const sender = req.user._id;
    const { matchId, text, receiverId, media } = req.body;

    // Security: Check if match exists and user is part of it
    const match = await Match.findOne({ _id: matchId, users: sender });
    if (!match) return res.status(403).json({ success: false, message: "Invalid Match" });

    const newMessage = await ChatMessage.create({
      matchId,
      sender,
      receiver: receiverId,
      text,
      media
    });

    // 🔥 VVIP: Match model update karo taaki Matches Tab mein chat upar aa jaye
    await Match.findByIdAndUpdate(matchId, {
      lastMessage: text || "Sent a media",
      lastMessageAt: new Date(),
      lastMessageBy: sender
    });

    // TODO: Yahan Socket.io emit jayega real-time ke liye
    
    return res.status(201).json({ success: true, data: newMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: "Chat failed" });
  }
};

// 2. GET MESSAGES (Optimized)
exports.getChatMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId } = req.body; // Body se hata kar params mein kiya
    const { page = 1, limit = 20 } = req.query;

    const messages = await ChatMessage.find({
      matchId,
      deletedFor: { $ne: userId }
    })
    .sort({ createdAt: -1 }) // Naye messages pehle
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();
     const formattedMessages = messages
      .reverse()
      .map(msg => ({
        id: msg._id,
        text: msg.text,

        isMine: msg.sender.toString() === userId.toString(),

        status: msg.readAt
          ? "read"
          : msg.deliveredAt
          ? "delivered"
          : "sent",

        sentAt: msg.createdAt,
        sentAtFormatted: new Date(msg.createdAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit"
        })
      }));

    // Frontend ko ascending order mein chahiye hote hain
    return res.json({
      success: true,
      data: formattedMessages
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
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



const redis = require("../../../config/cache");
const Profile = require("../../../modules/profile/profile.model");


exports.getChatList = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Fetch matches sorted by last message (TOP REORDER BASE)
    const matches = await Match.find({
      users: userId
    })
      .sort({ lastMessageAt: -1 })
      .lean();

    const chatList = [];

    for (const match of matches) {
      // 2️⃣ Find other user
      const otherUserId = match.users.find(
        u => u.toString() !== userId.toString()
      );

      const profile = await Profile.findOne({ userId: otherUserId })
  .select("nickname photos")
  .lean();


      // 3️⃣ Unread count
      const unreadCount = await ChatMessage.countDocuments({
        matchId: match._id,
        receiver: userId,
        readAt: null,
        deletedFor: { $ne: userId }
      });

      // 4️⃣ Online status (Redis)
     const isOnline = await redis.redisClient.get(
  `user:online:${otherUserId}`
);


      chatList.push({
        matchId: match._id,

        user: {
          id: otherUserId,
          name: profile?.nickname || "User",
          avatar: profile?.photos?.[0] || null,
          isOnline: Boolean(isOnline)
        },

        lastMessage: match.lastMessage || "",
        lastMessageAt: match.lastMessageAt,
        lastMessageFormatted: match.lastMessageAt
          ? new Date(match.lastMessageAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : null,

        unreadCount
      });
    }

    return res.json({
      success: true,
      data: chatList
    });

  } catch (err) {
    console.error("Chat list error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
