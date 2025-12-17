// routes/messages.js
const { uploadStream } = require("../../upload/cloudinary.service");
const ChatMessage = require("../chat/chat.message.model");
const { Match } = require("../swipe/swipe.model");
const ChatRoom = require("./chat.room.model");

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
    const receiverUid = req.user._id;
    const { matchId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    console.log("matchId:", matchId);
    console.log("receiverUId: ", receiverUid.toString());

    // 1. Check match exist
    const match = await Match.findById(matchId).lean();

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // 2. Check if user is part of the match
    if (!match.users.some((u) => u.toString() === receiverUid.toString())) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You are not part of this match",
      });
    }

    const skip = (page - 1) * limit;
    // 3. Fetch messages
    const messages = await ChatMessage.find({
      matchId,
      deletedFor: { $ne: receiverUid },
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalMessages = await ChatMessage.countDocuments({
      matchId,
      deletedFor: { $ne: receiverUid },
    });

    return res.json({
      success: true,
      data: messages,
      pagination: {
        total: totalMessages,
        page,
        pages: Math.ceil(totalMessages / limit),
      },
    });
  } catch (err) {
    console.error("GET CHAT MESSAGES ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/v1/messages/:matchId/read   // mark messages read or seen
// exports.updateChatMsgRead = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { matchId } = req.params;

//     // 1. Ensure match exists
//     const match = await Match.findById(matchId).lean();
//     if (!match) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Match not found" });
//     }

//     // 2. Ensure user is part of the match
//     if (!match.users.some((u) => u.toString() === userId.toString())) {
//       return res.status(403).json({
//         success: false,
//         message: "Forbidden — You are not part of this match",
//       });
//     }

//     // 3. Update unread messages where receiver = userId
//     const result = await ChatMessage.updateMany(
//       { matchId, receiver: userId, read: false },
//       { $set: { read: true, readAt: new Date() } }
//     );

//     return res.json({ success: true, readCount: result.modifiedCount });
//   } catch (err) {
//     console.error("ERROR updating chat read status:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

exports.updateChatMsgRead = async (req, res) => {
  try {
    const receiverUid = req.user._id;
    const { matchId } = req.params;

    // 1️⃣ Validate match
    const match = await Match.findById(matchId).lean();
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    // 2️⃣ Validate membership
    if (!match.users.some((u) => u.toString() === receiverUid.toString())) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — not part of this match",
      });
    }

    // 3️⃣ Mark messages as READ
    const result = await ChatMessage.updateMany(
      {
        matchId,
        receiver: receiverUid,
        status: { $ne: "read" },
      },
      {
        status: "read",
        readAt: new Date(),
      }
    );

    // Reset unreadCount
    await ChatRoom.findOneAndUpdate(
      { matchId },
      {
        $set: {
          [`unreadCount.${receiverUid}`]: 0,
        },
      }
    );

    // 4️⃣ Notify sender (socket)
    req.io?.to(`chat:${matchId}`).emit("messages_read", {
      matchId,
      readerId: receiverUid,
    });

    return res.json({
      success: true,
      readCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("UPDATE READ STATUS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// DELETE for Single message /api/v1/messages/:matchId/:messageId
exports.deleteChatMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId, mesId } = req.params;

    console.log("matchId:", matchId);
    console.log("messageId:", mesId);
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
    const message = await ChatMessage.findById(mesId);
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
      mesId,
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

// DELETE ALL messages (soft delete) for user, jese hi ye api hi hogi then jiske side se call hui hn ab usko koi old messages nhi show honge.
exports.deleteAllChatMessagesForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId } = req.params;

    // 1) Validate match
    const match = await Match.findById(matchId).lean();
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // Ensure user is part of match hai ki nhi hn
    if (!match.users.some((u) => u.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You are not part of this match",
      });
    }

    // 2) Soft delete all messages for this user, sirf user ko dikhane ke liye delete hogye hn
    const result = await ChatMessage.updateMany(
      {
        matchId,
        deletedFor: { $ne: userId }, // avoid duplicate push
      },
      {
        $addToSet: { deletedFor: userId },
      }
    );

    return res.json({
      success: true,
      message: "All messages deleted for user",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("DELETE ALL MESSAGES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST Upload media controller to upload image, video, and GIFs
exports.uploadChatMediaController = async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        message: "No media files uploaded",
      });
    }

    const uploads = await Promise.all(
      req.files.map(async (file) => {
        let folder = "mafs/chatsMedia";
        let resourceType = "image";
        let type = "image";

        if (file.mimetype.startsWith("video")) {
          resourceType = "video";
          type = "video";
        } else if (file.mimetype === "image/gif") {
          type = "gif";
        }

        const originalName = file.originalname
          .split(".")
          .slice(0, -1)
          .join("."); // remove extension

        const result = await uploadStream(file.buffer, {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true, // prevent overwrite
          filename_override: originalName,
        });

        return {
          url: result.secure_url,
          publicId: result.public_id,
          originalName: file.originalname,
          type,
        };
      })
    );

    return res.status(200).json({
      success: true,
      media: uploads, // 🔥 always array
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
media:[
   {
     "url": "https://res.cloudinary.com/.../chat-media/photo_abc123.jpg",
     "publicId": "chat-media/photo_abc123",
     "originalName": "photo.jpg",
     "type": "image"
   }, 
   ....
]
*/
