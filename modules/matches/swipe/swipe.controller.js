// const profileModel = require("../../profile/profile.model");
// const userActionsModel = require("./BlockReport/userActions.model");
const mongoose = require("mongoose");
const { Match } = require("./swipe.model");
const service = require("./swipe.service");
const Swipe = require("./swipe.model");
const redis = require("../../../config/cache");
const Profile = require("../../profile/profile.model");

module.exports.getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;

    // Profile validation is handled inside getFeedService (service.js Line 54)
    // Removed duplicate Profile.findOne() that was wasting 1 DB query per request

    const feedResult = await service.getFeedService(userId, limit, page);

    return res.json({
      success: true,
      message: "Feed fetched successfully",
      count: feedResult.data.length,
      data: feedResult.data,
    });
  } catch (err) {
    console.error("GET FEED ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.action = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetId, action } = req.body;

    // Gate: Only verified users with complete profiles can perform actions
    const swiperProfile = await Profile.findOne({ userId })
      .select("isMandatoryComplete verification")
      .lean();

    if (!swiperProfile) {
      return res.status(403).json({
        success: false,
        message: "Please complete your profile to start matching!",
        data: {
          actionAllowed: false,
          reason: "PROFILE_NOT_FOUND"
        }
      });
    }

    if (!swiperProfile.isMandatoryComplete) {
      return res.status(403).json({
        success: false,
        message: "Complete your profile to start swiping!",
        data: {
          actionAllowed: false,
          reason: "PROFILE_INCOMPLETE"
        }
      });
    }

    if (swiperProfile.verification?.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Verify your identity to unlock swiping",
        data: {
          actionAllowed: false,
          reason: "VERIFICATION_PENDING",
          verificationStatus: swiperProfile.verification?.status || "not_started"
        }
      });
    }

    const result = await service.doSwipe(userId, targetId, action);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Swipe error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Error processing swipe",
    });
  }
};

module.exports.unmatchUser = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { matchId } = req.body;
    const userId = req.user._id;

    let otherUserId = null;
    await session.withTransaction(async () => {
      // 1. Match dhundo aur check karo ki user us match ka part hai
      const match = await Match.findOne({ _id: matchId, users: userId })
        .session(session)
        .lean();

      if (!match) {
        throw new Error("Match not found or already unmatched");
      }

      otherUserId = match.users.find(
        (u) => u.toString() !== userId.toString()
      );

      // 2. Match delete karo
      await Match.deleteOne({ _id: matchId }).session(session);

      // 3. Swipes delete karo (Dono taraf se)
      await Swipe.deleteMany({
        $or: [
          { swiperId: userId, targetId: otherUserId },
          { swiperId: otherUserId, targetId: userId },
        ],
      }).session(session);

      // 4. Emit real-time event via Socket (through EventEmitter)
      const chatEvents = require("../../../events/chat.events");
      chatEvents.emit("match_deleted", {
        matchId,
        userId1: userId.toString(),
        userId2: otherUserId.toString(),
      });
    });

    // Complete cache invalidation — feed, exclude, AND matches
    if (redis && otherUserId) {
      await Promise.all([
        redis.del(`feed:${userId.toString()}`),
        redis.del(`feed:${otherUserId.toString()}`),
        redis.del(`feed:exclude:${userId.toString()}`),
        redis.del(`feed:exclude:${otherUserId.toString()}`),
        redis.del(`matches:${userId}`),
        redis.del(`matches:${otherUserId}`),
      ]);
      console.log("⚡ [UNMATCH] All caches cleared for both users");
    }

    return res.json({ success: true, message: "Unmatched successfully" });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  } finally {
    await session.endSession(); // Guaranteed cleanup — no session leak
  }
};

module.exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all matches (no populate needed — we only use raw user IDs)
    const matches = await Match.find({ users: userId })
      .sort({ lastMessageAt: -1, matchedAt: -1 })
      .lean();

    // Collect all partner IDs in one pass
    const partnerIds = matches
      .map(match => match.users.find(u => u.toString() !== userId.toString()))
      .filter(Boolean);

    // Single bulk query instead of N individual queries (N+1 → 2 queries)
    const partnerProfiles = partnerIds.length > 0
      ? await Profile.find({ userId: { $in: partnerIds } })
          .select("userId nickname dob photos")
          .lean()
      : [];

    // Build O(1) lookup map
    const profileMap = new Map();
    partnerProfiles.forEach(p => profileMap.set(p.userId.toString(), p));

    // Construct results synchronously (no async needed)
    const conversations = matches.map(match => {
      const partnerId = match.users.find(
        u => u.toString() !== userId.toString()
      );
      if (!partnerId) return null;

      const profile = profileMap.get(partnerId.toString());
      if (!profile) return null;

      const age = profile.dob ? calculateAge(profile.dob) : null;
      const mainPhotoUrl =
        profile.photos?.sort((a, b) => a.order - b.order)[0]?.url || null;

      return {
        matchId: match._id,
        partnerId,
        nickname: profile.nickname || "User",
        age,
        mainPhotoUrl,
        isNew: !match.lastMessageAt,
        lastMessage: match.lastMessage || null,
        lastMessageTime: match.lastMessageAt || null,
        matchedAt: match.createdAt,
      };
    });

    return res.json({
      success: true,
      data: {
        conversations: conversations.filter(Boolean),
      },
    });
  } catch (err) {
    console.error("getMatches error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function calculateAge(dob) {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000); // Years in ms
}

module.exports.getKeenData = async (req, res, actionType) => {
  try {
    const userId = req.user._id;

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch my profile to get location for distance calculation
    const myProfile = await Profile.findOne({ userId }).select("location").lean();

    // 1. Un IDs ko nikalna jinhe user ne already swipe kiya hai
    const mySwipedIds = await Swipe.find({ swiperId: userId }).distinct(
      "targetId"
    );

    const matchedUserIds = await Match.find({ users: userId })
      .lean()
      .then(matches =>
        matches.map(m =>
          m.users.find(u => u.toString() !== userId.toString())
        )
      );


    // 2. Swipes dhundna (Populate ko Profile collection par point kar rahe hain)
    const keens = await Swipe.find({
      targetId: userId,
      action: actionType,
      swiperId: { $nin: mySwipedIds }
      //      swiperId: {
      //   $nin: [...mySwipedIds, ...matchedUserIds]
      // }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'swiperId',
        model: 'Profile',   // <--- YE SABSE IMPORTANT HAI (Profile collection se data lega)
        foreignField: 'userId', // <--- Profile model mein userId se match karega
        select: 'nickname dob photos location about'
      });


    const total = await Swipe.countDocuments({
      targetId: userId,
      action: actionType,
      // swiperId: { $nin: mySwipedIds }
      swiperId: {
        $nin: [...mySwipedIds, ...matchedUserIds]
      }
    });


    const formattedData = keens.map(item => {
      const profile = item.swiperId;

      if (!profile || !profile.nickname) return null;

      const age = calculateAge(profile.dob);
      let distance = 0;
      if (myProfile?.location?.coordinates && profile.location?.coordinates) {
        distance = calculateDistance(
          myProfile.location.coordinates[1],
          myProfile.location.coordinates[0],
          profile.location.coordinates[1],
          profile.location.coordinates[0]
        );
      }

      return {
        userId: profile.userId,
        nickname: profile.nickname,
        age: age,
        mainPhotoUrl: profile.photos?.sort((a, b) => a.order - b.order)[0]?.url || "",
        distanceText: distance <= 1 ? "Nearby" : `${distance} km away`,
        city: profile.location?.city || "Nearby",
        action: item.action, // 'like' or 'superlike'
        likedAt: item.createdAt // Manager ne 'likedAt' manga hai
      };
    }).filter(Boolean);


    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const hasMore = total > pageNum * limitNum;

    return res.json({
      success: true,
      data: formattedData,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: hasMore
      }
    });
  } catch (err) {
    console.error("Keen API Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getKeen = (req, res) => exports.getKeenData(req, res, "like");
exports.getSuperKeen = (req, res) => exports.getKeenData(req, res, "superlike");



const UsageService = require("../../subscription/services/usage.service");

exports.undo = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ REWIND QUOTA CHECK — BEFORE opening any session
    try {
      await UsageService.useItem(userId, 'REWIND');
    } catch (error) {
      if (error.message === 'LIMIT_REACHED') {
        return res.status(403).json({
          success: false,
          message: "You've reached your daily Rewind limit! Upgrade to Premium for unlimited rewinds."
        });
      }
      throw error;
    }

    // 2️⃣ Find last swipe — NO session needed for read
    const lastSwipe = await Swipe.findOne({ swiperId: userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastSwipe) {
      throw new Error("No swipe found to undo");
    }

    const { targetId, action } = lastSwipe;
    const undone = { targetId, action };

    // 3️⃣ Conditional transaction — only when match might exist
    if (action === "like" || action === "superlike") {
      const match = await Match.findOne({
        users: { $all: [userId, targetId] },
      }).lean();

      if (match) {
        // Transaction needed — deleting match + swipes atomically
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await Match.deleteOne({ _id: match._id }).session(session);
            await Swipe.deleteMany({
              $or: [
                { swiperId: userId, targetId },
                { swiperId: targetId, targetId: userId },
              ],
            }).session(session);
          });
        } finally {
          await session.endSession();
        }

        // Clear ALL caches for both users
        if (redis) {
          await Promise.all([
            redis.del(`feed:${userId.toString()}`),
            redis.del(`feed:${targetId.toString()}`),
            redis.del(`feed:exclude:${userId.toString()}`),
            redis.del(`feed:exclude:${targetId.toString()}`),
            redis.del(`matches:${userId}`),
            redis.del(`matches:${targetId}`),
          ]);
        }
      } else {
        // No match exists — simple delete, no transaction
        await Swipe.deleteOne({ _id: lastSwipe._id });
        if (redis) {
          await Promise.all([
            redis.del(`feed:${userId.toString()}`),
            redis.del(`feed:exclude:${userId.toString()}`),
          ]);
        }
      }
    } else {
      // "pass" undo — simplest case, no transaction, no match check
      await Swipe.deleteOne({ _id: lastSwipe._id });
      if (redis) {
        await Promise.all([
          redis.del(`feed:${userId.toString()}`),
          redis.del(`feed:exclude:${userId.toString()}`),
        ]);
      }
    }

    // 4️⃣ Usage status (served from Redis cache via FIX 6A)
    const status = await UsageService.getUsageStatus(userId);

    return res.json({
      success: true,
      message: "Swipe undone successfully",
      data: {
        undoneAction: undone,
        isPremium: status.data.isPremium,
        showAds: status.data.showAds,
        premiumFeatures: status.data.premiumFeatures,
        allocations: status.data.allocations,
        wallet: status.data.wallet
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.getKeen = (req, res) =>
  module.exports.getKeenData(req, res, "like");
module.exports.getSuperKeen = (req, res) =>
  module.exports.getKeenData(req, res, "superlike");