const { default: mongoose } = require("mongoose");
const swipeModel = require("../swipe.model");
const { Match } = require("../swipe.model");
const UserAction = require("./userActions.model");

let redis;
// Try common redis export paths (adjust to your project)
try {
  redis = require("../../../../config/cache").redis || require("../../../../config/redis").redis;
// eslint-disable-next-line no-unused-vars
} catch (e) {
  // if not found, require will throw; instruct user to set redis variable later
  redis = null;
}

const SWIPE_QUEUE_PREFIX = "swipe_queue:"; 

// CREATE BLOCK or REPORT
exports.createAction = async (req, res) => {
  try {
    const { actionType, targetId, reason } = req.body;
    console.log("createAction:")
    const actorId = req.user._id;
      if (actorId.toString() === targetId.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: "You cannot block yourself" 
      });
    }
    if (!actionType || !targetId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // Only require reason for report
    if (actionType === "report" && !reason) {
      return res.status(400).json({ success: false, message: "Reason is required for report" });
    }

    await UserAction.create({
      actionType,
      actorId,
      targetId,
      reason: actionType === "report" ? reason : null
    });
     await Match.findOneAndDelete({
      users: { $all: [actorId, targetId] }
    });

    if (redis) {
      const queueKey = SWIPE_QUEUE_PREFIX + actorId;
      await redis.del(queueKey);
    }

    return res.json({
      success: true,
      message: `${actionType} action saved successfully`
    });

  } catch (err) {
    console.log("createAction error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already performed this action on this user"
      });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL BLOCKED USERS
exports.getBlockedUsers = async (req, res) => {
  try {
    const actorId = req.user._id;

    const blocked = await UserAction.find({
      actorId,
      actionType: "block"
    });

    return res.json({
      success: true,
      blockedUsers: blocked
    });

  } catch (err) {
    console.log("getBlockedUsers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL REPORTED USERS
exports.getReportedUsers = async (req, res) => {
  try {
    const actorId = req.user._id;

    const reported = await UserAction.find({
      actorId,
      actionType: "report"
    });

    return res.json({
      success: true,
      reportedUsers: reported
    });

  } catch (err) {
    console.log("getReportedUsers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// UNBLOCK USER
// exports.unblockUser = async (req, res) => {
//   try {
//     const actorId = req.user._id;
//     const targetId = req.params.targetId;

//     const removed = await UserAction.findOneAndDelete({
//       actorId,
//       targetId,
//       actionType: "block"
//     });

//     if (!removed) {
//       return res.status(404).json({ success: false, message: "Block not found" });
//     }

//     return res.json({
//       success: true,
//       message: "User unblocked successfully"
//     });

//   } catch (err) {
//     console.log("unblockUser error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// In userActions.controller.js
exports.unblockUser = async (req, res) => {
  try {
    const { targetId } = req.body;
    const actorId = req.user._id;

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // 1. Remove the block record
      const result = await UserAction.deleteOne({
        actorId,
        targetId,
        actionType: 'block'
      }).session(session);

      if (result.deletedCount === 0) {
        throw new Error("Block record not found");
      }

      // 2. Remove any existing swipes in both directions
      await swipeModel.deleteMany({
        $or: [
          { swiperId: actorId, targetId: targetId },
          { swiperId: targetId, targetId: actorId }
        ]
      }).session(session);

      // 3. Clear any existing matches
      await Match.deleteMany({
        users: { $all: [actorId, targetId] }
      }).session(session);

      // 4. Clear Redis cache
      if (redis) {
        await Promise.all([
          redis.del(`user:matches:${actorId}`),
          redis.del(`user:matches:${targetId}`),
          redis.del(`${SWIPE_QUEUE_PREFIX}${actorId}`),
          redis.del(`${SWIPE_QUEUE_PREFIX}${targetId}`)
        ]);
      }
    });

    session.endSession();

    return res.json({
      success: true,
      message: "User unblocked successfully. Previous interactions have been cleared."
    });

  } catch (error) {
    console.error("Error in unblockUser:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
};