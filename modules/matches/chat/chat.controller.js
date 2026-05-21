/* eslint-disable no-unused-vars */
const ChatMessage = require("./chat.message.model");
const { Match } = require("../swipe/swipe.model");
const { isBlocked } = require("../../profile/block.service");
const { DateTime } = require("luxon");
const redis = require("../../../config/cache");
const Profile = require("../../../modules/profile/profile.model");

// 1. SEND MESSAGE (Sabse important jo missing tha)
module.exports.sendMessage = async (req, res) => {
  const start = Date.now();
  const userId = req.user._id;
  const { matchId, text, media } = req.body;
  console.log(`[SEND MESSAGE START] Sender: ${userId} -> Match: ${matchId}`);
  try {
    // 1. Ensure match exists and user is part of it
    const match = await Match.findById(matchId);
    if (!match || !match.users.some((u) => u.toString() === userId.toString())) {
      console.log(`[SEND MESSAGE FAILED] Sender: ${userId} -> Match: ${matchId} | Reason: Invalid Match`);
      return res.status(403).json({ success: false, message: "Invalid Match" });
    }

    const receiverId = match.users.find(
      (u) => u.toString() !== userId.toString(),
    );

    // 2. Block Check
    const blockStatus = await isBlocked(userId, receiverId);
    if (blockStatus.isBlocked) {
      console.log(`[SEND MESSAGE FAILED] Sender: ${userId} -> Receiver: ${receiverId} | Reason: Blocked`);
      return res.status(403).json({
        success: false,
        message: "You cannot send messages to this user",
        errorType: "BLOCKED",
        isBlockedByMe: blockStatus.blockedByMe,
        blockedBy: blockStatus.blockedBy,
      });
    }

    const newMessage = await ChatMessage.create({
      matchId,
      sender: userId,
      receiver: receiverId,
      text,
      media: media || [],
    });

    // 🔥 VVIP: Match model update karo taaki Matches Tab mein chat upar aa jaye
    await Match.findByIdAndUpdate(matchId, {
      lastMessage: text || "📷 Media",
      lastMessageAt: new Date(),
      lastMessageBy: userId,
    });

    if (redis) {
      Promise.all([
        redis.del(`chat:list:${userId.toString()}`),
        redis.del(`chat:list:${receiverId.toString()}`),
      ]).catch((err) => console.error("Error clearing chat list cache in sendMessage:", err));
    }

    const formattedMessage = {
      id: newMessage._id,
      text: newMessage.text,
      media: newMessage.media || [],
      isMine: true,
      status: "sent",
      sentAt: DateTime.fromJSDate(new Date(newMessage.createdAt))
        .setZone("Asia/Kolkata")
        .toString(),
      sentAtFormatted: DateTime.fromJSDate(new Date(newMessage.createdAt))
        .setZone("Asia/Kolkata")
        .toFormat("hh:mm a"),
    };

    console.log(`[SEND MESSAGE OK] Sender: ${userId} -> Receiver: ${receiverId} | Match: ${matchId} | Time: ${Date.now() - start}ms`);
    return res.status(201).json({ success: true, data: formattedMessage });
  } catch (err) {
    console.error(`[SEND MESSAGE ERROR] Sender: ${userId} -> Match: ${matchId} | Error: ${err.message}`, err);
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
        message: "Match not found",
      });
    }

    if (!match.users.some((u) => u.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this match",
      });
    }
    const otherUserId = match.users.find(
      (u) => u.toString() !== userId.toString(),
    );

    // const blocked = await isBlocked(userId, otherUserId);
    // if (blocked) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You cannot view messages"
    //   });
    // }

    const blockStatus = await isBlocked(userId, otherUserId);

    // If blocked, but ONLY by them (I didn't block them), deny access.
    // If I blocked them (blockedByMe = true), allow me to read my own history.
    if (blockStatus.isBlocked && !blockStatus.blockedByMe) {
      return res.status(403).json({
        success: false,
        message: "You cannot view messages",
        errorType: "BLOCKED", // ✅ NEW
        isBlockedByMe: blockStatus.blockedByMe, // ✅ NEW — frontend needs this
        blockedBy: blockStatus.blockedBy,
      });
    }

    const messages = await ChatMessage.find({
      matchId,
      deletedFor: { $ne: userId },
    })
      .sort({ createdAt: -1 }) // Naye messages pehle
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const formattedMessages = messages.reverse().map((msg) => ({
      id: msg._id,
      text: msg.text,
      media: msg.media || [],
      isMine: msg.sender.toString() === userId.toString(),

      status: msg.readAt ? "read" : msg.deliveredAt ? "delivered" : "sent",

      sentAt: DateTime.fromJSDate(new Date(msg.createdAt))
        .setZone("Asia/Kolkata")
        .toString(),
      sentAtFormatted: DateTime.fromJSDate(new Date(msg.createdAt))
        .setZone("Asia/Kolkata")
        .toFormat("hh:mm a"),
    }));

    // Frontend ko ascending order mein chahiye hote hain
    return res.json({
      success: true,
      data: formattedMessages,
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

    // 3. Block validation
    const otherUserId = match.users.find((u) => u.toString() !== userId.toString());
    const blocked = await isBlocked(userId, otherUserId);
    if (blocked.isBlocked && !blocked.blockedByMe) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You cannot update read status while blocked",
      });
    }

    // 4. Update unread messages where receiver = userId
    const result = await ChatMessage.updateMany(
      { matchId, receiver: userId, status: { $ne: "READ" } },
      { $set: { status: "READ", readAt: new Date() } },
    );

    if (redis && result.modifiedCount > 0) {
      redis.del(`chat:list:${userId.toString()}`).catch((err) =>
        console.error("Error clearing chat list cache in updateChatMsgRead:", err)
      );
    }

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

    // console.log("matchId:", matchId);
    // console.log("messageId:", messageId);
    // console.log("userId:", userId.toString());

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
      { new: true },
    ).lean();

    if (redis) {
      redis.del(`chat:list:${userId.toString()}`).catch((err) =>
        console.error("Error clearing chat list cache in deleteChatMessage:", err)
      );
    }

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


module.exports.getChatList = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user._id;
  const CHAT_LIST_KEY = `chat:list:${userId.toString()}`;
  console.log(`[CHAT LIST START] User: ${userId} requesting chat list`);
  try {
    if (redis) {
      try {
        const cached = await redis.get(CHAT_LIST_KEY);
        if (cached) {
          const chatList = JSON.parse(cached);
          console.log(`[CHAT LIST END] User: ${userId} | CACHE HIT | Total Time: ${Date.now() - startTime}ms`);
          return res.json({ success: true, data: chatList });
        }
      } catch (err) {
        console.error("Chat list cache get error:", err);
      }
    }

    // 1️⃣ Fetch matches sorted by priority: Last Message OR New Match (TOP REORDER BASE)
    const matchesTimeStart = Date.now();
    const matches = await Match.find({
      users: userId,
    })
      .sort({ lastMessageAt: -1, matchedAt: -1 })
      .lean();
    const matchesTimeTaken = Date.now() - matchesTimeStart;

    if (!matches || matches.length === 0) {
      if (redis) {
        try {
          await redis.set(CHAT_LIST_KEY, JSON.stringify([]), { EX: 15 });
        } catch (err) {
          console.error("Chat list cache set 0 matches error:", err);
        }
      }
      console.log(`[CHAT LIST END] User: ${userId} has 0 matches. Total Time: ${Date.now() - startTime}ms`);
      return res.json({ success: true, data: [] });
    }

    // Prepare arrays for batch queries
    const matchIds = [];
    const otherUserIds = [];

    matches.forEach((match) => {
      matchIds.push(match._id);
      const otherUserId = match.users.find(
        (u) => u.toString() !== userId.toString()
      );
      if (otherUserId) otherUserIds.push(otherUserId);
    });

    // 2️⃣ BATCH: Fetch all related profiles in one query
    const profilesTimeStart = Date.now();
    const profiles = await Profile.find({ userId: { $in: otherUserIds } })
      .select("userId nickname photos")
      .lean();
    const profilesTimeTaken = Date.now() - profilesTimeStart;

    // Map profiles for O(1) lookup
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.userId.toString()] = p;
    });

    // 3️⃣ BATCH: Aggregate unread message counts for all matches in one query
    const unreadTimeStart = Date.now();
    const unreadCountsAggr = await ChatMessage.aggregate([
      {
        $match: {
          matchId: { $in: matchIds },
          receiver: userId,
          readAt: null,
          deletedFor: { $ne: userId },
        },
      },
      {
        $group: {
          _id: "$matchId",
          count: { $sum: 1 },
        },
      },
    ]);
    const unreadTimeTaken = Date.now() - unreadTimeStart;

    // Map unread counts for O(1) lookup
    const unreadMap = {};
    unreadCountsAggr.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    // 4️⃣ BATCH: Fetch all online statuses from Redis in one atomic mGet call
    const redisTimeStart = Date.now();
    let onlineStatuses = [];
    if (otherUserIds.length > 0) {
      const redisKeys = otherUserIds.map((id) => `user:online:${id.toString()}`);
      onlineStatuses = await redis.mGet(redisKeys);
    }
    const redisTimeTaken = Date.now() - redisTimeStart;

    // Map online status for O(1) lookup
    const onlineMap = {};
    otherUserIds.forEach((id, index) => {
      onlineMap[id.toString()] = Boolean(onlineStatuses[index]);
    });

    // 5️⃣ Construct final response efficiently from memory maps
    const chatList = matches.map((match) => {
      const otherUserId = match.users.find(
        (u) => u.toString() !== userId.toString()
      );
      const otherUserIdStr = otherUserId ? otherUserId.toString() : "";

      const profile = profileMap[otherUserIdStr];
      const unreadCount = unreadMap[match._id.toString()] || 0;
      const isOnline = onlineMap[otherUserIdStr] || false;

      return {
        matchId: match._id,
        user: {
          id: otherUserId,
          name: profile?.nickname || "User",
          avatarUrl: profile?.photos?.[0]?.url || null,
          isOnline: isOnline,
        },
        lastMessage: match.lastMessage
          ? {
              text: match.lastMessage,
              time: match.lastMessageAt,
              formattedTime: match.lastMessageAt
                ? DateTime.fromJSDate(new Date(match.lastMessageAt))
                    .setZone("Asia/Kolkata")
                    .toFormat("hh:mm a")
                : null,
            }
          : null,
        matchedAt: match.lastMessageAt,
        unreadCount,
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(
      `[CHAT LIST END] User: ${userId} | Matches: ${matches.length} | Time: ${totalTime}ms (MatchFind: ${matchesTimeTaken}ms, ProfileFind: ${profilesTimeTaken}ms, UnreadAggr: ${unreadTimeTaken}ms, RedisOnline: ${redisTimeTaken}ms)`
    );

    if (redis) {
      try {
        await redis.set(CHAT_LIST_KEY, JSON.stringify(chatList), { EX: 15 });
      } catch (err) {
        console.error("Chat list cache set error:", err);
      }
    }

    return res.json({
      success: true,
      data: chatList,
    });
  } catch (err) {
    console.error(`[CHAT LIST ERROR] User: ${userId} | Error: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const { uploadStream } = require("../../upload/cloudinary.service");

module.exports.uploadChatMediaController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { matchId } = req.body; // Remove receiverId from body for security
    const files = req.files;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: "matchId is required",
      });
    }

    // 1. Validate match and participants
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    if (!match.users.some(u => u.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this match",
      });
    }

    // 2. Identify receiver
    const receiverId = match.users.find(u => u.toString() !== userId.toString());

    // 3. Block check
    const blockStatus = await isBlocked(userId, receiverId);
    if (blockStatus.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Action forbidden due to blocks",
        errorType: "BLOCKED",
        isBlockedByMe: blockStatus.blockedByMe,
        blockedBy: blockStatus.blockedBy
      });
    }

    // 4. 🔥 Upload all files to Cloudinary (Bypassed if load testing)
    // Note: Middleware already checked per-type size limits
    let media;
    if (process.env.NODE_ENV === "test" || req.headers["x-bypass-cloudinary"] === "true") {
      media = files.map((file) => ({
        url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        publicId: "sample",
        originalName: file.originalname || "test.jpg",
        type: file.mimetype && file.mimetype.startsWith("video/") ? "video" : "image",
      }));
    } else {
      media = await Promise.all(
        files.map(async (file) => {
          const result = await uploadStream(file.buffer, {
            folder: `mafs/chat/${matchId}`,
            resource_type: "auto",
            transformation: [
              // { quality: "auto:good" }
              { quality: "auto", fetch_format: "auto" }
            ],
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
                  : "image",
          };
        }),
      );
    }

    // 5. 🔥 Save chat message in DB
    const message = await ChatMessage.create({
      matchId,
      sender: userId,
      receiver: receiverId,
      text: "", // media-only message
      media,
      status: "SENT",
    });

    // 6. 🔥 VVIP: Match model update karo
    await Match.findByIdAndUpdate(matchId, {
      lastMessage: "📷 Media",
      lastMessageAt: new Date(),
      lastMessageBy: userId,
    });

    if (redis) {
      Promise.all([
        redis.del(`chat:list:${userId.toString()}`),
        redis.del(`chat:list:${receiverId.toString()}`),
      ]).catch((err) => console.error("Error clearing chat list cache in uploadChatMediaController:", err));
    }

    const formattedMessage = {
      id: message._id,
      text: message.text,
      media: message.media || [],
      isMine: true,
      status: "sent",
      sentAt: DateTime.fromJSDate(new Date(message.createdAt))
        .setZone("Asia/Kolkata")
        .toString(),
      sentAtFormatted: DateTime.fromJSDate(new Date(message.createdAt))
        .setZone("Asia/Kolkata")
        .toFormat("hh:mm a"),
    };

    return res.json({
      success: true,
      message: "Media message sent successfully",
      data: formattedMessage,
    });
  } catch (err) {
    console.error("❌ uploadChatMediaController error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to upload chat media",
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
        message: "Message not found",
      });
    }

    // 🔐 Permission check
    if (
      message.sender.toString() !== userId.toString() &&
      message.receiver.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to delete this message",
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
          message: "Only sender can delete for everyone",
        });
      }

      // 🔥 Delete media from Cloudinary (Bypassed if load testing)
      if (message.media && message.media.length > 0 && process.env.NODE_ENV !== "test" && req.headers["x-bypass-cloudinary"] !== "true") {
        await Promise.all(
          message.media.map((m) => (m.publicId ? destroy(m.publicId) : null)),
        );
      }

      message.isDeletedForEveryone = true;
      message.text = "";
      message.media = [];

      await message.save();

      if (redis) {
        Promise.all([
          redis.del(`chat:list:${message.sender.toString()}`),
          redis.del(`chat:list:${message.receiver.toString()}`),
        ]).catch((err) => console.error("Error clearing chat list cache in delete for everyone:", err));
      }

      return res.json({
        success: true,
        message: "Message deleted for everyone",
      });
    }

    /* ================================
       🔥 DELETE FOR ME
    ================================= */
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    if (redis) {
      redis.del(`chat:list:${userId.toString()}`).catch((err) =>
        console.error("Error clearing chat list cache in delete for me:", err)
      );
    }

    return res.json({
      success: true,
      message: "Message deleted for you",
    });
  } catch (err) {
    console.error("❌ deleteChatMessageWithMedia error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete message",
    });
  }
};
