const service = require("./swipe.service");

// GET /swipe/feed?limit=10
exports.getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 20;
    const items = await service.getFeed(userId, limit);
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
    const result = await service.doSwipe(userId, targetId, action);

    if (result.already) {
      return res.json({ success: true, message: "Already swiped" });
    }

    // if (result.match) {
    //   // You can also push to notification queue here or emit socket
    //   return res.json({ success: true, message: "It's a match!", data: result.match });
    // }

    if (result.match) {
      return res.json({
        success: true,
        message: "It's a match!",
        matchId: result.matchId,
      });
    }

    return res.json({ success: true, message: "Swipe recorded" });
  } catch (err) {
    console.error("swipe.action", err);
    return res.status(400).json({ success: false, message: err.message });
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

// GET /swipe/matches
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    const matches = await require("./swipe.model")
      .Match.find({ users: userId })
      .lean();
    return res.json({ success: true, data: matches });
  } catch (err) {
    console.error("swipe.getMatches", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
