/* eslint-disable no-unused-vars */
const ChatMessage = require("./chat.message.model");
const { Match } = require("../swipe/swipe.model");
const { isBlocked } = require("../../profile/block.service");
const { DateTime } = require("luxon");


// 1. SEND MESSAGE (Sabse important jo missing tha)
module.exports.sendMessage = async (req, res) => {
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
    
    const formattedMessage = {
      id: newMessage._id,
      text: newMessage.text,
      media: newMessage.media || [],
      isMine: true,
      status: "sent",
      sentAt: DateTime.fromJSDate(new Date(newMessage.createdAt)).setZone("Asia/Kolkata").toString(),
      sentAtFormatted: DateTime.fromJSDate(new Date(newMessage.createdAt)).setZone("Asia/Kolkata").toFormat("hh:mm a")
    };

    return res.status(201).json({ success: true, data: formattedMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: "Chat failed" });
  }
};

// 2. GET MESSAGES (Optimized)
module.exports.getChatMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    // const { matchId } = req.body; 
    // const { matchId } = req.query; 
    const { matchId } = req.params;

    const { page = 1, limit = 20 } = req.query;


    const match = await Match.findById(matchId).lean();
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found"
      });
    }

    if (!match.users.some(u => u.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this match"
      });
    }
    const otherUserId = match.users.find(
      u => u.toString() !== userId.toString()
    );

    // const blocked = await isBlocked(userId, otherUserId);
    // if (blocked) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You cannot view messages"
    //   });
    // }

       const blockStatus = await isBlocked(userId, otherUserId);

    if (blockStatus.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "You cannot view messages",
        errorType: "BLOCKED",                    // ✅ NEW
        isBlockedByMe: blockStatus.blockedByMe,   // ✅ NEW — frontend needs this
          blockedBy: blockStatus.blockedBy  
      });
    }


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
 media: msg.media || [], 
        isMine: msg.sender.toString() === userId.toString(),

        status: msg.readAt
          ? "read"
          : msg.deliveredAt
          ? "delivered"
          : "sent",

        sentAt: DateTime.fromJSDate(new Date(msg.createdAt)).setZone("Asia/Kolkata").toString(),
        sentAtFormatted: DateTime.fromJSDate(new Date(msg.createdAt)).setZone("Asia/Kolkata").toFormat("hh:mm a")
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
module.exports.updateChatMsgRead = async (req, res) => {
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
module.exports.deleteChatMessage = async (req, res) => {
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


module.exports.getChatList = async (req, res) => {
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
          avatarUrl: profile?.photos?.[0]?.url || null,
          isOnline: Boolean(isOnline)
        },

        lastMessage: match.lastMessage
          ? {
              text: match.lastMessage,
              time: match.lastMessageAt,
              formattedTime: match.lastMessageAt 
                ? DateTime.fromJSDate(new Date(match.lastMessageAt)).setZone("Asia/Kolkata").toFormat("hh:mm a")
                : null
            }
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
const { uploadStream } = require("../../upload/cloudinary.service");

module.exports.uploadChatMediaController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId, receiverId } = req.body;
    const files = req.files;

    if (!matchId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId are required"
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No media files uploaded"
      });
    }

    // 🔐 Optional safety: validate match
    const matchExists = await Match.findById(matchId);
    if (!matchExists) {
      return res.status(404).json({
        success: false,
        message: "Match not found"
      });
    }

    // 🔥 Upload all files to Cloudinary
    const media = await Promise.all(
      files.map(async (file) => {
        const result = await uploadStream(file.buffer, {
          folder: `mafs/chat/${matchId}`,
          resource_type: "auto",
          transformation: [{ quality: "auto:good" }]
        });

        return {
          url: result.secure_url,
          publicId: result.public_id,
          originalName: file.originalname,
          type:
            result.resource_type === "video"
              ? "video"
              : file.mimetype === "image/gif"
              ? "gif"
              : "image"
        };
      })
    );

    // 🔥 Save chat message in DB
    const message = await ChatMessage.create({
      matchId,
      sender: userId,
      receiver: receiverId,
      text: "", // media-only message
      media,
      status: "SENT",
      // clientMessageId
    });

    // 🔥 VVIP: Match model update karo
    await Match.findByIdAndUpdate(matchId, {
      lastMessage: "Sent a media",
      lastMessageAt: new Date(),
      lastMessageBy: userId
    });

    const formattedMessage = {
      id: message._id,
      text: message.text,
      media: message.media || [],
      isMine: true,
      status: "sent",
      sentAt: DateTime.fromJSDate(new Date(message.createdAt)).setZone("Asia/Kolkata").toString(),
      sentAtFormatted: DateTime.fromJSDate(new Date(message.createdAt)).setZone("Asia/Kolkata").toFormat("hh:mm a")
    };

    return res.json({
      success: true,
      message: "Media message sent successfully",
      data: formattedMessage
    });

  } catch (err) {
    console.error("❌ uploadChatMediaController error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to upload chat media"
    });
  }
};


const { destroy } = require("../../upload/cloudinary.service");

module.exports.deleteChatMessageWithMedia = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.query;

    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // 🔐 Permission check
    if (
      message.sender.toString() !== userId.toString() &&
      message.receiver.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to delete this message"
      });
    }

    /* ================================
       🔥 DELETE FOR EVERYONE
    ================================= */
    if (deleteForEveryone === "true") {

      // Only sender can delete for everyone
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only sender can delete for everyone"
        });
      }

      // 🔥 Delete media from Cloudinary
      if (message.media && message.media.length > 0) {
        await Promise.all(
          message.media.map(m =>
            m.publicId ? destroy(m.publicId) : null
          )
        );
      }

      message.isDeletedForEveryone = true;
      message.text = "";
      message.media = [];

      await message.save();

      return res.json({
        success: true,
        message: "Message deleted for everyone"
      });
    }

    /* ================================
       🔥 DELETE FOR ME
    ================================= */
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    return res.json({
      success: true,
      message: "Message deleted for you"
    });

  } catch (err) {
    console.error("❌ deleteChatMessageWithMedia error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete message"
    });
  }
};