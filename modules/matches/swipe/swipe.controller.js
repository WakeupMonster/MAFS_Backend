// const profileModel = require("../../profile/profile.model");
// const userActionsModel = require("./BlockReport/userActions.model");

const { Match } = require("./swipe.model");
const service = require("./swipe.service");
const swipeLimiter = require("./limit.service");
const ApiError = require("../../../common/errors/ApiError");
const Swipe = require("./swipe.model");

// GET /swipe/feed?limit=10
exports.getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 20;

    console.log("hyopen");
    const items = await service.getFeed(userId, limit);
    console.log("byclose");

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("swipe.getFeed", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /swipe/action  { targetId, action }
exports.action = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetId, action } = req.body;

    // === RATE LIMIT CHECK (like / superlike only) ===
    if (["like", "superlike"].includes(action)) {
      const limitCheck = await swipeLimiter.checkAndIncrement(userId, action);

      if (!limitCheck.allowed) {
        throw new ApiError(`Daily ${action} limit reached`, 429, {
          type: "RATE_LIMIT_EXCEEDED",
          limitType: action === "like" ? "dailyLikes" : "dailySuperlikes",
          current: limitCheck.count,
          max: limitCheck.limit,
          resetsIn: limitCheck.resetTime - Math.floor(Date.now() / 1000),
        });
      }
    }

    // === DO SWIPE ===
    const result = await service.doSwipe(userId, targetId, action);

    // If a match happened (taken from feature/raj logic)
    if (result.match) {
      return res.json({
        success: true,
        message: "It's a match!",
        matchId: result.matchId,
      });
    }

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
exports.undo = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetId } = req.body;

    const r = await service.undoSwipe(userId, targetId);

    return res.json({ success: true, message: "Undo done", data: r });
  } catch (err) {
    console.error("swipe.undo", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// exports.getMatches = async (req, res) => {
//   try {
//     const userId = req.user._id;
    
//     // Get all non-blocked matchess
//     const matches = await Match.find({ 
//       users: userId,
//       status: { $ne: 'blocked' }
//     })
//     .populate({
//       path: 'users',
//       match: { _id: { $ne: userId } },
//       select: 'fullName photos isOnline lastSeen'
//     })
//     .sort({ updatedAt: -1 })
//     .lean();

//     // Filter out any null users and transform the data
//     const validMatches = matches
//       .filter(match => match.users && match.users.length > 0)
//       .map(match => ({
//         matchId: match._id,
//         user: match.users[0], // The other user
//         matchedAt: match.createdAt,
//         status: match.status || 'matched' // Default status
//       }));

//     // If no matches, include a helpful message
//     if (validMatches.length === 0) {
//       return res.json({ 
//         success: true, 
//         data: [],
//         message: "No matches found. Keep swiping to find your perfect match!",
//         meta: { total: 0 }
//       });
//     }

//     return res.json({ 
//       success: true, 
//       data: validMatches,
//       meta: { total: validMatches.length }
//     });
//   } catch (err) {
//     console.error("Error in getMatches:", err);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Error fetching matches",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };




// POST /swipe/action  { targetId, action }
// exports.action = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { targetId, action } = req.body;
//     const result = await service.doSwipe(userId, targetId, action);

//     if (result.already) {
//       return res.json({ success: true, message: "Already swiped" });
//     }

//     // if (result.match) {
//     //   // You can also push to notification queue here or emit socket
//     //   return res.json({ success: true, message: "It's a match!", data: result.match });
//     // }

//     if (result.match) {
//   return res.json({ 
//     success: true, 
//     message: "It's a match!",
//     matchId: result.matchId
//   });
// }

//     return res.json({ success: true, message: "Swipe recorded" });
//   } catch (err) {
//     console.error("swipe.action", err);
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };


// GET /swipe/matches
// exports.getMatches = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const matches = await require("./swipe.model").Match.find({ users: userId }).lean();
//     return res.json({ success: true, data: matches });
//   } catch (err) {
//     console.error("swipe.getMatches", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


// In swipe.controller.js
// exports.getMatches = async (req, res) => {
//   try {
//     const userId = req.user._id;
    
//     // Get all matches
//     const matches = await Match.find({ 
//       users: userId,
//       status: { $ne: 'blocked' } // Don't show blocked matches
//     })
//     .populate('users', 'fullName photos isOnline lastSeen')
//     .sort({ updatedAt: -1 })
//     .lean();

//     // Add match status to each user
//     const enhancedMatches = await Promise.all(matches.map(async (match) => {
//       const otherUser = match.users.find(u => u._id.toString() !== userId.toString());
      
//       return {
//         matchId: match._id,
//         user: {
//           ...otherUser,
//           // Add any additional user fields you need
//         },
//         matchedAt: match.createdAt,
//         // lastMessage: await getLastMessage(match._id, userId), // If you have chat
//         // unreadCount: await getUnreadCount(match._id, userId) // If you have read receipts
//       };
//     }));

//     return res.json({ 
//       success: true, 
//       data: enhancedMatches,
//       meta: {
//         total: enhancedMatches.length,
//         // Add any pagination info if needed
//       }
//     });
//   } catch (err) {
//     console.error("Error in getMatches:", err);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Error fetching matches",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };



// exports.getKeen = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const likes = await swipeModel.find({
//       targetId: userId,
//       action: "like"
//     })
//     .populate("swiperId", "nickname age photos location") 
//     .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       data: likes,
//       total: likes.length
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


// exports.getSuperKeen = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const superlikes = await swipeModel.find({
//       targetId: userId,
//       action: "superlike"
//     })
//     .populate("swiperId", "nickname age photos location")
//     .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       data: superlikes,
//       total: superlikes.length
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };



// GET /superkeen






// exports.getMatches = async (req, res) => {
//   try {
//     const userId = req.user._id; // keep as-is (Mongoose will handle ObjectId)
//     const page = Math.max(1, Number(req.query.page) || 1);
//     const limit = Math.max(1, Number(req.query.limit) || 20);
//     const skip = (page - 1) * limit;

//     // 1) First get total count (matches for this user excluding blocked)
//     const totalAgg = await Match.aggregate([
//       { $match: { users: userId, status: { $ne: "blocked" } } },
//       { $count: "count" }
//     ]);
//     const total = totalAgg[0] ? totalAgg[0].count : 0;

//     // 2) Build pipeline to fetch page of matches with profile + lastMessage + unreadCount
//     const pipeline = [
//       // Only matches where current user is included and not blocked
//       { $match: { users: userId, status: { $ne: "blocked" } } },

//       // Keep matchedAt (or createdAt as fallback)
//       {
//         $addFields: {
//           matchedAt: { $ifNull: ["$matchedAt", "$createdAt"] }
//         }
//       },

//       // Find the other user id in the users array
//       {
//         $addFields: {
//           otherUserIds: {
//             $filter: {
//               input: "$users",
//               as: "u",
//               cond: { $ne: ["$$u", userId] }
//             }
//           }
//         }
//       },
//       { $addFields: { otherUserId: { $arrayElemAt: ["$otherUserIds", 0] } } },

//       // Join Profile where profile.userId == otherUserId
//       {
//         $lookup: {
//           from: "profiles",                 // collection name
//           localField: "otherUserId",
//           foreignField: "userId",
//           as: "profile"
//         }
//       },
//       { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

//       // Lookup latest message for this match
//       {
//         $lookup: {
//           from: "messages",
//           let: { matchId: "$_id" },
//           pipeline: [
//             { $match: { $expr: { $eq: ["$matchId", "$$matchId"] } } },
//             { $sort: { createdAt: -1 } },
//             { $limit: 1 },
//             { $project: { action: 1 } },
//             {
//               $project: {
//                 _id: 1,
//                 text: 1,
//                 senderId: 1,
//                 receiverId: 1,
//                 createdAt: 1,
//                 isRead: 1
//               }
//             }
//           ],
//           as: "lastMessage"
//         }
//       },
//       { $addFields: { lastMessage: { $arrayElemAt: ["$lastMessage", 0] } } },

//       // Lookup unread count for this current user (messages for this match where receiver == current user && isRead == false)
//       // {
//       //   $lookup: {
//       //     from: "messages",
//       //     let: { matchId: "$_id" },
//       //     pipeline: [
//       //       {
//       //         $match: {
//       //           $expr: {
//       //             $and: [
//       //               { $eq: ["$matchId", "$$matchId"] },
//       //               { $eq: ["$receiverId", userId] },
//       //               { $in: [{ $type: "$isRead" }, ["bool", "string", "missing"]] } // tolerant check
//       //             ]
//       //           }
//       //         }
//       //       },
//       //       { $match: { isRead: false } },
//       //       { $count: "count" }
//       //     ],
//       //     as: "unread"
//       //   }
//       // },

//       // Lookup swipe action (who liked whom)
// {
//   $lookup: {
//     from: "swipes",
//     let: { selfId: userId, otherId: "$otherUserId" },
//     pipeline: [
//       {
//         $match: {
//           $expr: {
//             $or: [
//               {
//                 $and: [
//                   { $eq: ["$swiperId", "$$otherId"] },
//                   { $eq: ["$targetId", "$$selfId"] }
//                 ]
//               },
//               {
//                 $and: [
//                   { $eq: ["$swiperId", "$$selfId"] },
//                   { $eq: ["$targetId", "$$otherId"] }
//                 ]
//               }
//             ]
//           }
//         }
//       },
//       { $project: { action: 1 } },
//       { $limit: 1 }
//     ],
//     as: "swipeAction"
//   }
// },
// {
//   $addFields: {
//     action: { $arrayElemAt: ["$swipeAction.action", 0] }
//   }
// },


//       // { $addFields: { unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] } } },

//       // Derive primary photo (if exists) and prepare user object
//       {
//         $addFields: {
//           primaryPhoto: {
//             $let: {
//               vars: {
//                 primary: {
//                   $first: {
//                     $filter: {
//                       input: { $ifNull: ["$profile.photos", []] },
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
//                   { $arrayElemAt: [{ $ifNull: ["$profile.photos.url", []] }, 0] }
//                 ]
//               }
//             }
//           }
//         }
//       },

//       // Final projection for frontend
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
//             // include location if you want frontend to calculate distance
//             location: "$profile.location",
//             isOnline: "$profile.isOnline",
//             lastSeen: "$profile.lastSeen",
//             action: "$action" 
//           },
// action: "$action" ,
//           lastMessage: {
//             text: "$lastMessage.text",
//             sentAt: "$lastMessage.createdAt",
//             senderId: "$lastMessage.senderId"
//           },

//           unreadCount: 1
//         }
//       },

//       // Sort by lastMessage.sentAt desc (if exists), fallback to matchedAt
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

//     // Transform small fallbacks for missing profile
//     const transformed = results.map(r => ({
//       matchId: r.matchId,
//       user: {
//         userId: r.user.userId || null,
//         nickname: r.user.nickname || null,
//         age: r.user.age || null,
//         profilePic: r.user.profilePic || null,
//         location: r.user.location || null,
//         isOnline: Boolean(r.user.isOnline || false),
//         lastSeen: r.user.lastSeen || null
//       },
//       lastMessage: r.lastMessage && r.lastMessage.text ? {
//         text: r.lastMessage.text,
//         sentAt: r.lastMessage.sentAt,
//         senderId: r.lastMessage.senderId
//       } : null,
//       unreadCount: Number(r.unreadCount || 0),
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
//       message: "Error fetching matches",
//       error: process.env.NODE_ENV === "development" ? err.message : undefined
//     });
//   }
// };




exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id; // mongoose will auto cast (keep as string)

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // ---- TOTAL COUNT ----
    const totalAgg = await Match.aggregate([
      { $match: { users: userId, status: { $ne: "blocked" } } },
      { $count: "count" }
    ]);
    const total = totalAgg[0] ? totalAgg[0].count : 0;

    // ---- MAIN PIPELINE ----
    const pipeline = [
      { $match: { users: userId, status: { $ne: "blocked" } } },

      // Match date normalization
      {
        $addFields: {
          matchedAt: { $ifNull: ["$matchedAt", "$createdAt"] }
        }
      },

      // FIXED: CORRECT WAY TO FIND OTHER USER
      {
        $addFields: {
          otherUserId: {
            $first: {
              $setDifference: ["$users", [userId]] // string + objectId both handled
            }
          }
        }
      },

      // ================= PROFILE LOOKUP =================
      {
        $lookup: {
          from: "profiles",
          localField: "otherUserId",
          foreignField: "userId",
          as: "profile"
        }
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

      // ================= ACTION LOOKUP (like / superlike) =================
      {
        $lookup: {
          from: "swipes",
          let: { selfId: userId, otherId: "$otherUserId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    // case 1: current user swiped the other
                    {
                      $and: [
                        { $eq: ["$swiperId", "$$selfId"] },
                        { $eq: ["$targetId", "$$otherId"] }
                      ]
                    },
                    // case 2: other user swiped current user
                    {
                      $and: [
                        { $eq: ["$swiperId", "$$otherId"] },
                        { $eq: ["$targetId", "$$selfId"] }
                      ]
                    }
                  ]
                }
              }
            },
            { $project: { action: 1 } },
            { $limit: 1 }
          ],
          as: "swipeAction"
        }
      },

      { $addFields: { action: { $arrayElemAt: ["$swipeAction.action", 0] } } },

      // ================= LAST MESSAGE LOOKUP =================
      {
        $lookup: {
          from: "messages",
          let: { matchId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$matchId", "$$matchId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { 
              $project: { 
                text: 1, 
                senderId: 1, 
                receiverId: 1, 
                createdAt: 1 
              } 
            }
          ],
          as: "lastMessage"
        }
      },
      { $addFields: { lastMessage: { $arrayElemAt: ["$lastMessage", 0] } } },

      // ================= UNREAD COUNT LOOKUP =================
      {
        $lookup: {
          from: "messages",
          let: { matchId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$matchId", "$$matchId"] },
                    { $eq: ["$receiverId", userId] },
                    { $eq: ["$isRead", false] }
                  ]
                }
              }
            },
            { $count: "count" }
          ],
          as: "unread"
        }
      },
      {
        $addFields: {
          unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] }
        }
      },

      // ================= PRIMARY PHOTO =================
      {
        $addFields: {
          primaryPhoto: {
            $let: {
              vars: {
                primary: {
                  $first: {
                    $filter: {
                      input: "$profile.photos",
                      as: "p",
                      cond: { $eq: ["$$p.isPrimary", true] }
                    }
                  }
                }
              },
              in: {
                $cond: [
                  { $ifNull: ["$$primary", false] },
                  "$$primary.url",
                  {
                    $arrayElemAt: [
                      {
                        $ifNull: ["$profile.photos.url", []]
                      },
                      0
                    ]
                  }
                ]
              }
            }
          }
        }
      },

      // ================= FINAL PROJECTION =================
      {
        $project: {
          _id: 0,
          matchId: "$_id",
          matchedAt: 1,
          status: { $ifNull: ["$status", "matched"] },

          user: {
            userId: "$profile.userId",
            nickname: "$profile.nickname",
            age: "$profile.age",
            profilePic: "$primaryPhoto",
            location: "$profile.location",
            isOnline: "$profile.isOnline",
            lastSeen: "$profile.lastSeen",
            action: "$action" // <-- REQUIRED
          },

          lastMessage: {
            text: "$lastMessage.text",
            sentAt: "$lastMessage.createdAt",
            senderId: "$lastMessage.senderId"
          },

          unreadCount: 1
        }
      },

      // Sort by last message or match date
      {
        $addFields: {
          sortDate: { $ifNull: ["$lastMessage.sentAt", "$matchedAt"] }
        }
      },
      { $sort: { sortDate: -1 } },

      // Pagination
      { $skip: skip },
      { $limit: limit }
    ];

    const results = await Match.aggregate(pipeline);

    // FINAL TRANSFORM
    const transformed = results.map(r => ({
      matchId: r.matchId,
      user: r.user,
      lastMessage: r.lastMessage || null,
      unreadCount: r.unreadCount,
      matchedAt: r.matchedAt,
      status: r.status
    }));

    return res.json({
      success: true,
      data: transformed,
      meta: { total, page, limit }
    });
  } catch (err) {
    console.error("getMatches error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching matches"
    });
  }
};



exports.getKeen = async (req, res) => {
  try {
    const userId = req.user._id;   // FIXED: No need for ObjectId()

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const pipeline = [
      // USER RECEIVED LIKE
      { $match: { targetId: userId, action: "like" } },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // JOIN PROFILE DATA (Swiper → Profile.userId)
      {
        $lookup: {
          from: "profiles",
          localField: "swiperId",
          foreignField: "userId",
          as: "profile"
        }
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

      // Only return UI-friendly fields
      {
        $project: {
          _id: 1,
          action: 1,
          createdAt: 1,
          "userId": "$profile.userId",
          "nickname": "$profile.nickname",
          "age": "$profile.age",
          "photos": "$profile.photos",
          "location": "$profile.location"
        }
      }
    ];

    const items = await Swipe.aggregate(pipeline);

    // total count
    const totalAgg = await Swipe.aggregate([
      { $match: { targetId: userId, action: "like" } },
      { $count: "count" }
    ]);
    const total = totalAgg[0] ? totalAgg[0].count : 0;

    // Transform for frontend
    const response = items.map(i => {
      const photos = i.photos || [];

      const primaryPhoto =
        photos.find(p => p.isPrimary) ||
        photos[0] ||
        null;

      return {
        swipeId: i._id,
        userId: i.userId,
        nickname: i.nickname,
        age: i.age,
        profilePic: primaryPhoto ? primaryPhoto.url : null,
        location: i.location || null,
        likedAt: i.createdAt,
      };
    });

    return res.json({
      success: true,
      data: response,
      meta: { total, page, limit }
    });

  } catch (err) {
    console.error("getKeen Error =>", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};



const mongoose = require("mongoose");
exports.getSuperKeen = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { targetId: userId, action: "superlike" } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // join profiles where profiles.userId == swiperId
      {
        $lookup: {
          from: "profiles",              // collection name (lowercase plural)
          localField: "swiperId",        // value in swipe doc (user _id)
          foreignField: "userId",        // profile.userId
          as: "profile"
        }
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

      // project what frontend needs
      {
        $project: {
          _id: 1,
          action: 1,
          createdAt: 1,
          "profile.userId": 1,
          "profile.nickname": 1,
          "profile.age": 1,
          "profile.photos": 1,
          "profile.location": 1
        }
      }
    ];

    const items = await mongoose.model("Swipe").aggregate(pipeline);
    const totalAgg = await mongoose.model("Swipe").aggregate([
      { $match: { targetId: userId, action: "superlike" } },
      { $count: "count" }
    ]);
    const total = totalAgg[0] ? totalAgg[0].count : 0;

    // transform for frontend (primary photo + distance stub)
    const response = items.map(i => {
      const profile = i.profile || {};
      const primaryPhoto = (profile.photos && profile.photos.find(p => p.isPrimary)) || (profile.photos && profile.photos[0]) || null;
      return {
        // swipeId: i._id,
        userId: profile.userId || i.swiperId,
        nickname: profile.nickname || null,
        age: profile.age || null,
        profilePic: primaryPhoto ? primaryPhoto.url : null,
        location: profile.location || null,
        action: i.action,
        createdAt: i.createdAt
      };
    });

    return res.json({ success: true, data: response, meta: { total, page, limit } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
// exports.getMatches = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Better / full implementation from feature/rajeev
//     const matches = await Match.find({
//       users: userId,
//       status: { $ne: "blocked" },
//     })
//       .populate({
//         path: "users",
//         match: { _id: { $ne: userId } },
//         select: "fullName photos isOnline lastSeen",
//       })
//       .sort({ updatedAt: -1 })
//       .lean();

//     const validMatches = matches
//       .filter((match) => match.users && match.users.length > 0)
//       .map((match) => ({
//         matchId: match._id,
//         user: match.users[0],
//         matchedAt: match.createdAt,
//         status: match.status || "matched",
//       }));

//     if (validMatches.length === 0) {
//       return res.json({
//         success: true,
//         data: [],
//         message: "No matches found. Keep swiping to find your perfect match!",
//         meta: { total: 0 },
//       });
//     }

//     return res.json({
//       success: true,
//       data: validMatches,
//       meta: { total: validMatches.length },
//     });
//   } catch (err) {
//     console.error("Error in getMatches:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching matches",
//       error: process.env.NODE_ENV === "development" ? err.message : undefined,
//     });
//   }
// };
