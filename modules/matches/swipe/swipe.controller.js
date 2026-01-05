// const profileModel = require("../../profile/profile.model");
// const userActionsModel = require("./BlockReport/userActions.model");
const mongoose = require("mongoose");
const { Match } = require("./swipe.model");
const service = require("./swipe.service");
const swipeLimiter = require("./limit.service");
// const ApiError = require("../../../common/errors/ApiError");
const Swipe = require("./swipe.model");

exports.getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 20;

    const feedResult = await service.getFeedService(userId, limit);

    return res.json({
      success: true,
      count: feedResult.data.length,   // ✅ Access data array
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


// POST /swipe/action  { targetId, action }
exports.action = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetId, action } = req.body;

    // === RATE LIMIT CHECK (like / superlike only) ===
    // if (["like", "superlike"].includes(action)) {
    //   const limitCheck = await swipeLimiter.checkAndIncrement(userId, action);

    //   if (!limitCheck.allowed) {
    //     throw new ApiError(`Daily ${action} limit reached`, 429, {
    //       type: "RATE_LIMIT_EXCEEDED",
    //       limitType: action === "like" ? "dailyLikes" : "dailySuperlikes",
    //       current: limitCheck.count,
    //       max: limitCheck.limit,
    //       resetsIn: limitCheck.resetTime - Math.floor(Date.now() / 1000),
    //     });
    //   }
    // }

    // === DO SWIPE ===
    const result = await service.doSwipe(userId, targetId, action);

    // If a match happened (taken from feature/raj logic)
    // if (result.match) {
    //   return res.json({
    //     success: true,
    //     message: "It's a match!",
    //     matchId: result.matchId,
    //   });
    // }

    // Default response
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

// GET /swipe/limits
exports.getLimits = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const usage = await swipeLimiter.getUsage(userId);

    return res.json({
      success: true,
      data: usage,
    });
  } catch (err) {
    next(err);
  }
};

// POST /swipe/undo  { targetId }
// exports.undo = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { targetId } = req.body;

//     const r = await service.undoSwipe(userId, targetId);

//     return res.json({ success: true, message: "Undo done", data: r });
//   } catch (err) {
//     console.error("swipe.undo", err);
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

const redis = require("../../../config/cache");
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


const Profile = require("../../profile/profile.model"); // Check path

// newwala
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


// exports.getMatches = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // 1. Saare matches find karo jahan Pradeep user hai
//     const matches = await Match.find({ users: userId })
//       .sort({ lastMessageAt: -1, createdAt: -1 }) // Naye matches aur latest chats upar
//       .populate({
//         path: "users",
//         select: "nickname photos dob location" // Primary data populate
//       });

//     // 2. Data Transform karo (Figma Ready)
//     const formattedMatches = await Promise.all(matches.map(async (match) => {
//       // Apne aap ko array se nikalo, samne wale (partner) ka data lo
//       const partnerUser = match.users.find(u => u._id.toString() !== userId.toString());
      
//       if (!partnerUser) return null;

//       // Agar data Profile model mein hai, toh ek extra fetch (ya populate update)
//       const partnerProfile = await Profile.findOne({ userId: partnerUser._id }).select('nickname photos dob');

//       if (!partnerProfile) return null;

//       const age = calculateAge(partnerProfile.dob);
      
//       return {
//         matchId: match._id,
//         partnerId: partnerUser._id,
//         nickname: partnerProfile.nickname,
//         displayName: `${partnerProfile.nickname}, ${age}`,
//         profilePic: partnerProfile.photos?.sort((a,b) => a.order - b.order)[0]?.url || "",
//         lastMessage: match.lastMessageText || null, // Hum aage chat system mein add karenge
//         lastMessageTime: match.lastMessageAt || null,
//         isNew: !match.lastMessageAt, // Agar koi message nahi hai toh ye 'New Match' hai
//         matchedAt: match.createdAt
//       };
//     }));

//     const finalData = formattedMatches.filter(Boolean);

//     // 3. Figma Style Separation
//     const response = {
//       newMatches: finalData.filter(m => m.isNew),
//       conversations: finalData.filter(m => !m.isNew)
//     };

//     return res.json({
//       success: true,
//       data: response
//     });

//   } catch (err) {
//     console.error("Match Tab Error:", err);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };





// exports.getMatches = async (req, res) => {
//   try {
//     const userId = req.user._id; // mongoose will auto cast (keep as string)

//     const page = Math.max(1, Number(req.query.page) || 1);
//     const limit = Math.max(1, Number(req.query.limit) || 20);
//     const skip = (page - 1) * limit;

//     // ---- TOTAL COUNT ----
//     const totalAgg = await Match.aggregate([
//       { $match: { users: userId, status: { $ne: "blocked" } } },
//       { $count: "count" }
//     ]);
//     const total = totalAgg[0] ? totalAgg[0].count : 0;

//     // ---- MAIN PIPELINE ----
//     const pipeline = [
//       { $match: { users: userId, status: { $ne: "blocked" } } },

//       // Match date normalization
//       {
//         $addFields: {
//           matchedAt: { $ifNull: ["$matchedAt", "$createdAt"] }
//         }
//       },

//       // FIXED: CORRECT WAY TO FIND OTHER USER
//       {
//         $addFields: {
//           otherUserId: {
//             $first: {
//               $setDifference: ["$users", [userId]] // string + objectId both handled
//             }
//           }
//         }
//       },

//       // ================= PROFILE LOOKUP =================
//       {
//         $lookup: {
//           from: "profiles",
//           localField: "otherUserId",
//           foreignField: "userId",
//           as: "profile"
//         }
//       },
//       { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

//       // ================= ACTION LOOKUP (like / superlike) =================
//       {
//         $lookup: {
//           from: "swipes",
//           let: { selfId: userId, otherId: "$otherUserId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $or: [
//                     // case 1: current user swiped the other
//                     {
//                       $and: [
//                         { $eq: ["$swiperId", "$$selfId"] },
//                         { $eq: ["$targetId", "$$otherId"] }
//                       ]
//                     },
//                     // case 2: other user swiped current user
//                     {
//                       $and: [
//                         { $eq: ["$swiperId", "$$otherId"] },
//                         { $eq: ["$targetId", "$$selfId"] }
//                       ]
//                     }
//                   ]
//                 }
//               }
//             },
//             { $project: { action: 1 } },
//             { $limit: 1 }
//           ],
//           as: "swipeAction"
//         }
//       },

//       { $addFields: { action: { $arrayElemAt: ["$swipeAction.action", 0] } } },

//       // ================= LAST MESSAGE LOOKUP =================
//       {
//         $lookup: {
//           from: "messages",
//           let: { matchId: "$_id" },
//           pipeline: [
//             { $match: { $expr: { $eq: ["$matchId", "$$matchId"] } } },
//             { $sort: { createdAt: -1 } },
//             { $limit: 1 },
//             { 
//               $project: { 
//                 text: 1, 
//                 senderId: 1, 
//                 receiverId: 1, 
//                 createdAt: 1 
//               } 
//             }
//           ],
//           as: "lastMessage"
//         }
//       },
//       { $addFields: { lastMessage: { $arrayElemAt: ["$lastMessage", 0] } } },

//       // ================= UNREAD COUNT LOOKUP =================
//       {
//         $lookup: {
//           from: "messages",
//           let: { matchId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$matchId", "$$matchId"] },
//                     { $eq: ["$receiverId", userId] },
//                     { $eq: ["$isRead", false] }
//                   ]
//                 }
//               }
//             },
//             { $count: "count" }
//           ],
//           as: "unread"
//         }
//       },
//       {
//         $addFields: {
//           unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] }
//         }
//       },

//       // ================= PRIMARY PHOTO =================
//       {
//         $addFields: {
//           primaryPhoto: {
//             $let: {
//               vars: {
//                 primary: {
//                   $first: {
//                     $filter: {
//                       input: "$profile.photos",
//                       as: "p",
//                       cond: { $eq: ["$$p.isPrimary", true] }
//                     }
//                   }
//                 }
//               },
//               in: {
//                 $cond: [
//                   { $ifNull: ["$$primary", false] },
//                   "$$primary.url",
//                   {
//                     $arrayElemAt: [
//                       {
//                         $ifNull: ["$profile.photos.url", []]
//                       },
//                       0
//                     ]
//                   }
//                 ]
//               }
//             }
//           }
//         }
//       },

//       // ================= FINAL PROJECTION =================
//       {
//         $project: {
//           _id: 0,
//           matchId: "$_id",
//           matchedAt: 1,
//           status: { $ifNull: ["$status", "matched"] },

//           user: {
//             userId: "$profile.userId",
//             nickname: "$profile.nickname",
//             age: "$profile.age",
//             profilePic: "$primaryPhoto",
//             location: "$profile.location",
//             isOnline: "$profile.isOnline",
//             lastSeen: "$profile.lastSeen",
//             action: "$action" // <-- REQUIRED
//           },

//           lastMessage: {
//             text: "$lastMessage.text",
//             sentAt: "$lastMessage.createdAt",
//             senderId: "$lastMessage.senderId"
//           },

//           unreadCount: 1
//         }
//       },

//       // Sort by last message or match date
//       {
//         $addFields: {
//           sortDate: { $ifNull: ["$lastMessage.sentAt", "$matchedAt"] }
//         }
//       },
//       { $sort: { sortDate: -1 } },

//       // Pagination
//       { $skip: skip },
//       { $limit: limit }
//     ];

//     const results = await Match.aggregate(pipeline);

//     // FINAL TRANSFORM
//     const transformed = results.map(r => ({
//       matchId: r.matchId,
//       user: r.user,
//       lastMessage: r.lastMessage || null,
//       unreadCount: r.unreadCount,
//       matchedAt: r.matchedAt,
//       status: r.status
//     }));

//     return res.json({
//       success: true,
//       data: transformed,
//       meta: { total, page, limit }
//     });
//   } catch (err) {
//     console.error("getMatches error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching matches"
//     });
//   }
// };

// exports.getKeen = async (req, res) => {
//   try {
//     const userId = req.user._id;   // FIXED: No need for ObjectId()

//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const pipeline = [
//       // USER RECEIVED LIKE
//       { $match: { targetId: userId, action: "like" } },

//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit },

//       // JOIN PROFILE DATA (Swiper → Profile.userId)
//       {
//         $lookup: {
//           from: "profiles",
//           localField: "swiperId",
//           foreignField: "userId",
//           as: "profile"
//         }
//       },
//       { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

//       // Only return UI-friendly fields
//       {
//         $project: {
//           _id: 1,
//           action: 1,
//           createdAt: 1,
//           "userId": "$profile.userId",
//           "nickname": "$profile.nickname",
//           "age": "$profile.age",
//           "photos": "$profile.photos",
//           "location": "$profile.location"
//         }
//       }
//     ];

//     const items = await Swipe.aggregate(pipeline);

//     // total count
//     const totalAgg = await Swipe.aggregate([
//       { $match: { targetId: userId, action: "like" } },
//       { $count: "count" }
//     ]);
//     const total = totalAgg[0] ? totalAgg[0].count : 0;

//     // Transform for frontend
//     const response = items.map(i => {
//       const photos = i.photos || [];

//       const primaryPhoto =
//         photos.find(p => p.isPrimary) ||
//         photos[0] ||
//         null;

//       return {
//         swipeId: i._id,
//         userId: i.userId,
//         nickname: i.nickname,
//         age: i.age,
//         profilePic: primaryPhoto ? primaryPhoto.url : null,
//         location: i.location || null,
//         likedAt: i.createdAt,
//       };
//     });

//     return res.json({
//       success: true,
//       data: response,
//       meta: { total, page, limit }
//     });

//   } catch (err) {
//     console.error("getKeen Error =>", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getSuperKeen = async (req, res) => {
//   try {
//     const userId = new mongoose.Types.ObjectId(req.user._id);

//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const pipeline = [
//       { $match: { targetId: userId, action: "superlike" } },
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit },

//       // join profiles where profiles.userId == swiperId
//       {
//         $lookup: {
//           from: "profiles",              // collection name (lowercase plural)
//           localField: "swiperId",        // value in swipe doc (user _id)
//           foreignField: "userId",        // profile.userId
//           as: "profile"
//         }
//       },
//       { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

//       // project what frontend needs
//       {
//         $project: {
//           _id: 1,
//           action: 1,
//           createdAt: 1,
//           "profile.userId": 1,
//           "profile.nickname": 1,
//           "profile.age": 1,
//           "profile.photos": 1,
//           "profile.location": 1
//         }
//       }
//     ];

//     const items = await mongoose.model("Swipe").aggregate(pipeline);
//     const totalAgg = await mongoose.model("Swipe").aggregate([
//       { $match: { targetId: userId, action: "superlike" } },
//       { $count: "count" }
//     ]);
//     const total = totalAgg[0] ? totalAgg[0].count : 0;

//     // transform for frontend (primary photo + distance stub)
//     const response = items.map(i => {
//       const profile = i.profile || {};
//       const primaryPhoto = (profile.photos && profile.photos.find(p => p.isPrimary)) || (profile.photos && profile.photos[0]) || null;
//       return {
//         // swipeId: i._id,
//         userId: profile.userId || i.swiperId,
//         nickname: profile.nickname || null,
//         age: profile.age || null,
//         profilePic: primaryPhoto ? primaryPhoto.url : null,
//         location: profile.location || null,
//         action: i.action,
//         createdAt: i.createdAt
//       };
//     });

//     return res.json({ success: true, data: response, meta: { total, page, limit } });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


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

// Routing logic in Controller
exports.getKeen = (req, res) => exports.getKeenData(req, res, "like");
exports.getSuperKeen = (req, res) => exports.getKeenData(req, res, "superlike");