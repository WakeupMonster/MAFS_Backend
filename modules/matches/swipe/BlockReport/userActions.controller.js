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

const UserLimit = require("../userLimits.model"); 

exports.action = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const swiperId = req.user._id;
    const { targetId, action } = req.body; // action: 'like', 'pass', 'superlike'

    if (swiperId.toString() === targetId.toString()) {
        return res.status(400).json({ success: false, message: "Self-swipe not allowed" });
    }

    await session.withTransaction(async () => {
      // 1️⃣ Check Daily Limits (Likes/Superlikes)
      let limits = await UserLimit.findOne({ userId: swiperId }).session(session);
      if (!limits) limits = new UserLimit({ userId: swiperId });

      limits.resetIfNeeded();

      if (action === "superlike") {
        const SUPERLIKE_LIMIT = 5; // Production value
        if (limits.dailySuperlikes >= SUPERLIKE_LIMIT) {
          throw new Error("Daily Superlike limit reached! Try again tomorrow.");
        }
        limits.dailySuperlikes += 1;
        console.log(limits.dailySuperlikes," superlike")
      } else if (action === "like") {
        const LIKE_LIMIT = 50; 
        if (limits.dailyLikes >= LIKE_LIMIT) {
          throw new Error("Daily Like limit reached!");
        }
        limits.dailyLikes += 1;
      }

      // 2️⃣ Save Swipe
      await swipeModel.create([{ swiperId, targetId, action }], { session });
      await limits.save({ session });


      // 3️⃣ Match Logic (Only for Like/Superlike)
      if (action === "like" || action === "superlike") {
        const reverseSwipe = await swipeModel.findOne({
          swiperId: targetId,
          targetId: swiperId,
          action: { $in: ["like", "superlike"] }
        }).session(session);

        if (reverseSwipe) {
          // IT'S A MATCH! 
          await Match.create([{ users: [swiperId, targetId] }], { session });
          
          // Frontend ko turant batane ke liye
          res.locals.isMatch = true; 
        }
      }

      // 4️⃣ Clear Redis Feed Cache for both users
      if (redis) {
        await redis.del(`feed:${swiperId}`);
        await redis.del(`feed:${targetId}`);
      }
    });

    session.endSession();
    return res.json({
      success: true,
      isMatch: res.locals.isMatch || false,
      message: `Action '${action}' recorded successfully`
    });

  } catch (err) {
    session.endSession();
    return res.status(400).json({ success: false, message: err.message });
  }
};



// CREATE BLOCK or REPORT
// exports.createAction = async (req, res) => {
//   try {
//     const { actionType, targetId, reason } = req.body;
//     console.log("createAction:")
//     const actorId = req.user._id;
//       if (actorId.toString() === targetId.toString()) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "You cannot block yourself" 
//       });
//     }
//     if (!actionType || !targetId) {
//       return res.status(400).json({ success: false, message: "Missing fields" });
//     }

//     // Only require reason for report
//     if (actionType === "report" && !reason) {
//       return res.status(400).json({ success: false, message: "Reason is required for report" });
//     }

//     await UserAction.create({
//       actionType,
//       actorId,
//       targetId,
//       reason: actionType === "report" ? reason : null
//     });
//      await Match.findOneAndDelete({
//       users: { $all: [actorId, targetId] }
//     });

//     if (redis) {
//       const queueKey = SWIPE_QUEUE_PREFIX + actorId;
//       await redis.del(queueKey);
//     }

//     return res.json({
//       success: true,
//       message: `${actionType} action saved successfully`
//     });

//   } catch (err) {
//     console.log("createAction error:", err);

//     if (err.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: "You already performed this action on this user"
//       });
//     }

//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

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



exports.getLimits = async (req, res) => {
  try {
    const userId = req.user._id;
    let limits = await UserLimit.findOne({ userId });
    console.log(limits.dailySuperlikes,"likie")
    
    if (!limits) limits = await UserLimit.create({ userId });
    limits.resetIfNeeded();

    return res.json({
      success: true,
      data: {
        likesRemaining: Math.max(0, 50 - limits.dailyLikes),
        superlikesRemaining: Math.max(0, 5 - limits.dailySuperlikes),
        totalLikesUsed: limits.dailyLikes,
        totalSuperlikesUsed: limits.dailySuperlikes,
        nextReset: "Midnight (Local Time)"
      }
    });
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch limits" });
  }
};





// exports.getLimits = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const profile = await Profile.findOne({ userId }); // Aapka current profile model
    
//     let limits = await UserLimit.findOne({ userId });
//     if (!limits) limits = await UserLimit.create({ userId });
//     limits.resetIfNeeded();

//     // Subscription ke basis par limits set karna
//     const isPremium = profile.subscription?.isActive || false;
    
//     // Configurable Limits
//     const MAX_FREE_LIKES = 50;
//     const MAX_FREE_SUPERLIKES = 1;
//     const MAX_PREMIUM_SUPERLIKES = 5;

//     return res.json({
//       success: true,
//       data: {
//         plan: profile.subscription?.planId || "free",
//         isPremium: isPremium,
//         likes: {
//           remaining: isPremium ? 999 : Math.max(0, MAX_FREE_LIKES - limits.dailyLikes),
//           total: isPremium ? "Unlimited" : MAX_FREE_LIKES
//         },
//         superlikes: {
//           remaining: isPremium 
//             ? Math.max(0, MAX_PREMIUM_SUPERLIKES - limits.dailySuperlikes) 
//             : Math.max(0, MAX_FREE_SUPERLIKES - limits.dailySuperlikes),
//           total: isPremium ? MAX_PREMIUM_SUPERLIKES : MAX_FREE_SUPERLIKES
//         },
//         boosts: profile.subscription?.boostsCount || 0,
//         rewinds: profile.subscription?.rewindsCount || 0
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Error fetching limits" });
//   }
// };