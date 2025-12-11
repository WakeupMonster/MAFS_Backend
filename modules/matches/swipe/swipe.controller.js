// const profileModel = require("../../profile/profile.model");
// const userActionsModel = require("./BlockReport/userActions.model");

const { Match } = require("./swipe.model");
const service = require("./swipe.service");
const swipeLimiter = require('./limit.service');
const ApiError = require("../../../common/errors/ApiError");

// GET /swipe/feed?limit=10
exports.getFeed = async (req, res) => {
  
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 20;
    console.log("hyopen")
    const items = await service.getFeed(userId, limit);
    console.log("byclose")
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("swipe.getFeed", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.action = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetId, action } = req.body;

     if (['like', 'superlike'].includes(action)) {
      const limitCheck = await swipeLimiter.checkAndIncrement(userId, action);
      
      if (!limitCheck.allowed) {
        throw new ApiError(`Daily ${action} limit reached`, 429, {
          type: 'RATE_LIMIT_EXCEEDED',
          limitType: action === 'like' ? 'dailyLikes' : 'dailySuperlikes',
          current: limitCheck.count,
          max: limitCheck.limit,
          resetsIn: limitCheck.resetTime - Math.floor(Date.now() / 1000)
        });
      }
    }

    const result = await service.doSwipe(userId, targetId, action);
    return res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Swipe error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Error processing swipe'
    });
  }
};

exports.getLimits = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const usage = await swipeLimiter.getUsage(userId);
    return res.json({
      success: true,
      data: usage
    });
  } catch (err) {
    next(err);
  }
};

// POST /swipe/undo { targetId }
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

exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all non-blocked matches
    const matches = await Match.find({ 
      users: userId,
      status: { $ne: 'blocked' }
    })
    .populate({
      path: 'users',
      match: { _id: { $ne: userId } },
      select: 'fullName photos isOnline lastSeen'
    })
    .sort({ updatedAt: -1 })
    .lean();

    // Filter out any null users and transform the data
    const validMatches = matches
      .filter(match => match.users && match.users.length > 0)
      .map(match => ({
        matchId: match._id,
        user: match.users[0], // The other user
        matchedAt: match.createdAt,
        status: match.status || 'matched' // Default status
      }));

    // If no matches, include a helpful message
    if (validMatches.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        message: "No matches found. Keep swiping to find your perfect match!",
        meta: { total: 0 }
      });
    }

    return res.json({ 
      success: true, 
      data: validMatches,
      meta: { total: validMatches.length }
    });
  } catch (err) {
    console.error("Error in getMatches:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Error fetching matches",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};




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


