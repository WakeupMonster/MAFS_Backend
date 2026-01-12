// const profileModel = require("../../profile/profile.model");
// const userActionsModel = require("./BlockReport/userActions.model");
const mongoose = require("mongoose");
const { Match } = require("./swipe.model");
const service = require("./swipe.service");
const Swipe = require("./swipe.model");
const redis = require("../../../config/cache");
const Profile = require("../../profile/profile.model");

exports.getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 20;

    const feedResult = await service.getFeedService(userId, limit);
    

    return res.json({
      success: true,
      count: feedResult.data.length,  
       cached: feedResult.cached,
      data: feedResult.data,
      userQuota: feedResult.userQuota
    });
  } catch (err) {
    console.error("GET FEED ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
exports.action = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetId, action } = req.body;
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
exports.unmatchUser = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { matchId } = req.body;
    const userId = req.user._id;

    await session.withTransaction(async () => {
      // 1. Match dhundo aur check karo ki user us match ka part hai
      const match = await Match.findOne({ _id: matchId, users: userId }).session(session);
      
      if (!match) {
        throw new Error("Match not found or already unmatched");
      }

      const otherUserId = match.users.find(u => u.toString() !== userId.toString());

      // 2. Match delete karo
      await Match.deleteOne({ _id: matchId }).session(session);

      // 3. Swipes delete karo (Dono taraf se)
      // Isse wo log wapas feed mein dikhne lagenge (Optional: depend karta hai client ki requirement par)
      await Swipe.deleteMany({
        $or: [
          { swiperId: userId, targetId: otherUserId },
          { swiperId: otherUserId, targetId: userId }
        ]
      }).session(session);
    });
 if (redis) {
        const CACHE_KEY = `feed:${userId.toString()}`;
        await redis.del(CACHE_KEY);
        console.log("Redis cache cleared for new filters");
    }

    session.endSession();
    return res.json({ success: true, message: "Unmatched successfully" });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ success: false, message: err.message });
  }
};
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;

    const matches = await Match.find({ users: userId })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate({
        path: "users",
        select: "_id"
      })
      .lean();

    const conversations = await Promise.all(
      matches.map(async (match) => {
        // Partner ID
        const partnerId = match.users.find(
          u => u._id.toString() !== userId.toString()
        )?._id;

        if (!partnerId) return null;

        // Partner profile
        const profile = await Profile.findOne({ userId: partnerId })
          .select("nickname dob photos")
          .lean();

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
          matchedAt: match.createdAt
        };
      })
    );

    return res.json({
      success: true,
      data: {
        conversations: conversations.filter(Boolean)
      }
    });

  } catch (err) {
    console.error("getMatches error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
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

exports.getKeenData = async (req, res, actionType) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 1. Un IDs ko nikalna jinhe user ne already swipe kiya hai
    const mySwipedIds = await Swipe.find({ swiperId: userId }).distinct("targetId");

    // 2. Swipes dhundna (Populate ko Profile collection par point kar rahe hain)
    const keens = await Swipe.find({
      targetId: userId,
      action: actionType,
      // swiperId: { $nin: mySwipedIds }
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
      swiperId: { $nin: mySwipedIds }
    });


    const formattedData = keens.map(item => {
      const profile = item.swiperId; 

      if (!profile || !profile.nickname) return null;

      const age = calculateAge(profile.dob);
      let distance = 0;
      if (req.user.location?.coordinates && profile.location?.coordinates) {
        distance = calculateDistance(
          req.user.location.coordinates[1], req.user.location.coordinates[0],
          profile.location.coordinates[1], profile.location.coordinates[0]
        );
      }

      // 🔥 EXACT MANAGER RESPONSE FORMAT
      return {
        userId: profile.userId, 
        nickname: profile.nickname,
        age: age,
        mainPhotoUrl: profile.photos?.sort((a,b) => a.order - b.order)[0]?.url || "",
        distanceText: distance <= 1 ? "1 km away" : `${distance} km away`,
        city: profile.location?.city || "Nearby",
        action: item.action, // 'like' or 'superlike'
        likedAt: item.createdAt // Manager ne 'likedAt' manga hai
      };
    }).filter(Boolean);

    // 🔥 META LOGIC WITH hasMore
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
        hasMore: hasMore // ✅ Frontend check karega: if(hasMore) loadNextPage()
      }
    });

  } catch (err) {
    console.error("Keen API Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getKeen = (req, res) => exports.getKeenData(req, res, "like");
exports.getSuperKeen = (req, res) => exports.getKeenData(req, res, "superlike");