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

// GET /swipe/limits
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

// GET /swipe/matches
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;

    // Better / full implementation from feature/rajeev
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

    const validMatches = matches
      .filter(match => match.users && match.users.length > 0)
      .map(match => ({
        matchId: match._id,
        user: match.users[0],
        matchedAt: match.createdAt,
        status: match.status || 'matched'
      }));

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
