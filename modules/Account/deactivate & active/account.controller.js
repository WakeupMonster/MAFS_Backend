const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const { invalidateUserFeedCache } = require("../../../common/utils/feedCache.util");

/**
 * ================================
 * DEACTIVATE ACCOUNT
 * ================================
 */
exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ userId });
    console.log("profileflagcan", profile.canAccessSwipe ,userId,profile.discovery.globalVisibility)

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Already deactivated
    if (profile.discovery.globalVisibility === "nobody") {
      return res.status(400).json({
        success: false,
        message: "Account already deactivated"
      });
    }

    // Industry approach: hide profile + disable access
    profile.discovery.globalVisibility = "nobody";
    // profile.canAccessSwipe  = false;
    // profile.isDiscoverable = false;

    await profile.save();

     await invalidateUserFeedCache();

    // Optional but recommended: stop push notifications
    await User.updateOne(
      { _id: userId },
      { $set: { fcmTokens: [] } }
    );

    return res.json({
      success: true,
      message: "Account deactivated successfully"
    });

  } catch (error) {
    console.error("Deactivate account error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate account"
    });
  }
};


/**
 * ================================
 * REACTIVATE ACCOUNT
 * ================================
 */

exports.reactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    if (profile.discovery.globalVisibility  !== "nobody") {
      return res.status(400).json({
        success: false,
        message: "Account is already active"
      });
    }

    // Restore based on profile state
    // const canAccess = profile.isMandatoryComplete && profile.verification.status === "approved";

    profile.discovery.globalVisibility = "everyone";
    // profile.canAccessSwipe = canAccess;
    // profile.isDiscoverable = canAccess;

    await profile.save();

     await invalidateUserFeedCache();

    return res.json({
      success: true,
      message: "Account reactivated successfully"
    });

  } catch (error) {
    console.error("Reactivate account error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reactivate account"
    });
  }
};


const mongoose = require('mongoose');
const {Match} = require("../../../modules/matches/swipe/swipe.model");
const Swipe = require("../../../modules/matches/swipe/swipe.model");
// const Message = require("../../../modules/matches/chat/chat.message.model");
// const ChatRoom = require("../../matches/chat/chat.room.model");
const redis = require("../../../config/cache");


// const { invalidateAllFeedCaches } = require("../../../common/utils/feedCache.util");


// exports.deleteAccount = async (req, res) => {
//   const userId = req.user._id;
//   const session = await mongoose.startSession();
//   session.startTransaction();
// console.log("step1")
//   try {
//     // 1. Verify user exists
    
//     const user = await User.findById(userId).session(session);
//     console.log("step2")

//     if (!user) {
//       await session.abortTransaction();
//       console.log("step3")
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     // 2. Delete matches where user is a participant
//     await Match.updateMany(
//       { users: userId },
//       { $pull: { users: userId } },
//       { session }
//     );
//     console.log("step4")

//     // Get match IDs where the user was the only participant (to clean up empty matches)
//     const emptyMatches = await Match.find(
//       { users: { $size: 0 } },
//       { _id: 1 }
//     ).session(session).lean();
//     const emptyMatchIds = emptyMatches.map(m => m._id);
//     console.log("step5")

//     // Delete empty matches
//     if (emptyMatchIds.length > 0) {
//       await Match.deleteMany(
//         { _id: { $in: emptyMatchIds } },
//         { session }
//       );
//     }
//     console.log("step6")

//     // 3. Delete chat rooms and messages
//     // First find all chat rooms
//     const chatRooms = await ChatRoom.find({
//       $or: [
//         { participants: userId },
//         { matchId: { $in: emptyMatchIds } }
//       ]
//     }).session(session).lean();
//     console.log("step1")

//     const chatRoomIds = chatRooms.map(room => room._id);

//     // Delete all messages in these chat rooms
//     // await Message.deleteMany(
//     //   { roomId: { $in: chatRoomIds } },
//     //   { session }
//     // );

//     // Then delete the chat rooms


//     console.log("step8")
//     await ChatRoom.deleteMany(
//       { _id: { $in: chatRoomIds } },
//       { session }
//     );
//     console.log("step9")

//     // // 4. Delete user's messages in other chat rooms
//     // await Message.deleteMany(
//     //   { sender: userId },
//     //   { session }
//     // );

//     // 5. Delete swipes
//     await Swipe.deleteMany({
//       $or: [
//         { swiperId: userId },
//         { targetId: userId }
//       ]
//     }, { session });

//     console.log("step10")

//     // 6. Delete profile
//     await Profile.deleteOne({ userId }, { session });
// console.log("step11")
//     // 7. Delete user
//     await User.deleteOne({ _id: userId }, { session });
// console.log("step12")
//     // 8. Redis cleanup
//     if (redis?.isOpen) {
//       await redis.del(`feed:${userId.toString()}`);
//       // Remove user from online users
//       await redis.del(`user:online:${userId}`);
//       // Remove socket mappings
//       await redis.del(`sockets:${userId}`);
//     }
// console.log("step13")
//     // Invalidate all feeds
//     // await invalidateAllFeedCaches();
// console.log("step14")
//     // Commit the transaction
//     await session.commitTransaction();
// console.log("step15")
//     return res.json({
//       success: true,
//       message: "Account and all related data deleted successfully"
//     });
//   } catch (err) {
//     await session.abortTransaction();
//     console.error("Delete account error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete account",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   } finally {
//     await session.endSession();
//   }
// };




// exports.deleteAccount = async (req, res) => {
//   const userId = req.user._id;

//   try {
//     // ================================
//     // 1️⃣ Fetch profile (sanity check)
//     // ================================
//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         message: "Profile not found"
//       });
//     }

//     // ================================
//     // 2️⃣ Delete Matches
//     // ================================
//     // await Match.deleteMany({
//     //   users: userId
//     // });
//     const matches = await Match.find(
//       { users: userId },
//       { _id: 1 }
//     ).lean();

//     const matchIds = matches.map(m => m._id);

//     // ================================
//     // 3️⃣ Delete chat rooms (CRITICAL)
//     // ================================
//     await ChatRoom.deleteMany({
//       $or: [
//         { matchId: { $in: matchIds } },
//         { participants: userId }
//       ]
//     });

//     // ================================
//     // 3️⃣ Delete Swipes
//     // ================================
//     await Swipe.deleteMany({
//       $or: [
//         { swiperId: userId },
//         { targetId: userId }
//       ]
//     });

    

//     // ================================
//     // 4️⃣ Delete Messages
//     // ================================
//     await Message.deleteMany({
//       $or: [
//         { sender: userId },
//         { receiver: userId }
//       ]
//     });

//     // ================================
//     // 5️⃣ Delete Profile
//     // ================================
//     await Profile.deleteOne({ userId });

//     // ================================
//     // 6️⃣ Delete User
//     // ================================
//     await User.deleteOne({ _id: userId });

//     // ================================
//     // 7️⃣ Redis Cleanup
//     // ================================
//     if (redis?.isOpen) {
//       await redis.del(`feed:${userId.toString()}`);
//     }

//     // Invalidate all feeds (user removed)
//     await invalidateAllFeedCaches();

//     // ================================
//     // 8️⃣ Final response
//     // ================================
//     return res.json({
//       success: true,
//       message: "Account deleted permanently"
//     });

//   } catch (err) {
//     console.error("Delete account error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete account"
//     });
//   }
// };


// exports.deleteAccount = async (req, res) => {
//   const userId = req.user._id;
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // 1. Verify user exists
//     const user = await User.findById(userId).session(session);
//     if (!user) {
//       await session.abortTransaction();
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     // 2. Handle matches
//     await Match.deleteMany({
//   users: { $in: [userId] }  // ✅ Ye sahi hai - array ke andar userId dhoondhega
// }).session(session);


// console.log(`Deleted ${deletedMatches.deletedCount} matches`);

//     // 3. Get all match IDs where user was involved
//     // const matchIds = userMatches.map(m => m._id);

//     // 4. Delete chat rooms and messages
//     // const chatRooms = await ChatRoom.find({
//     //   $or: [
//     //     { participants: userId },
//     //     { matchId: { $in: matchIds } }
//     //   ]
//     // }).session(session);

//     // const chatRoomIds = chatRooms.map(room => room._id);

//     // Delete messages in these chat rooms
//     // await Message.deleteMany(
//     //   { $or: [{ roomId: { $in: chatRoomIds } }, { sender: userId }] },
//     //   { session }
//     // );

//     // Delete the chat rooms
//     // await ChatRoom.deleteMany(
//     //   { _id: { $in: chatRoomIds } },
//     //   { session }
//     // );

//     // // 5. Delete swipes
//     // await Swipe.deleteMany({
//     //   $or: [
//     //     { swiperId: userId },
//     //     { targetId: userId }
//     //   ]
//     // }, { session });

//     // // 6. Delete profile
//     // await Profile.deleteOne({ userId }, { session });

//     // // 7. Delete user
//     // await User.deleteOne({ _id: userId }, { session });

//     // 8. Redis cleanup
//     if (redis?.isOpen) {
//       await redis.del(`feed:${userId.toString()}`);
//       await redis.del(`user:online:${userId}`);
//       await redis.del(`sockets:${userId}`);
//     }

//     // 9. Invalidate all feeds

//     // Commit the transaction
//     await session.commitTransaction();

//     return res.json({
//       success: true,
//       message: "match data deleted successfully"
//     });

//   } catch (err) {
//     await session.abortTransaction();
//     console.error("Delete account error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete account",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   } finally {
//     await session.endSession();
//   }
// };





// exports.deleteAccount = async (req, res) => {
//   const userId = req.user._id;

//   try {
//     const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
//       ? new mongoose.Types.ObjectId(userId) 
//       : userId;
    
//     console.log('🔍 Deleting account for userId:', userObjectId);

//     // 1. Verify user exists
//     const user = await User.findById(userObjectId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     // 2. Delete matches WITHOUT session first (testing)
//     const deletedMatches = await Match.deleteMany({
//       users: { $in: [userObjectId] }
//     });

//     console.log(`✅ Deleted ${deletedMatches.deletedCount} matches`);


//     return res.json({
//       success: true,
//       message: "Account deleted successfully",
//       deletedData: {
//         matches: deletedMatches.deletedCount,
      
//       }
//     });

//   } catch (err) {
//     console.error("❌ Delete account error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete account",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };



// Controller file ke top pe import ko fix karo:
// const { Swipe, Match } = require('../models/swipe.model');

exports.deleteAccount = async (req, res) => {
  const userId = req.user._id;

  try {
    // Convert to ObjectId
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    console.log('🔍 Deleting account for userId:', userObjectId);

    // 1. Verify user exists
    const user = await User.findById(userObjectId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 2. Delete matches - MongoDB shell mein jo query kaam kari wahi use karo
    const deletedMatches = await Match.deleteMany({
      users: userObjectId
    });

    console.log(`✅ Deleted ${deletedMatches.deletedCount} matches`);

    // 3. Delete swipes
    const deletedSwipes = await Swipe.deleteMany({
      $or: [
        { swiperId: userObjectId },
        { targetId: userObjectId }
      ]
    });
    
    console.log(`✅ Deleted ${deletedSwipes.deletedCount} swipes`);

    // 4. Delete profile
    const deletedProfile = await Profile.deleteOne({ 
      userId: userObjectId 
    });
    
    console.log(`✅ Deleted profile:`, deletedProfile.deletedCount);

    // 5. Delete user
    const deletedUser = await User.deleteOne({ 
      _id: userObjectId 
    });
    
    console.log(`✅ Deleted user:`, deletedUser.deletedCount);

    // 6. Redis cleanup
    if (redis?.isOpen) {
      try {
        await redis.del(`feed:${userObjectId.toString()}`);
        await redis.del(`user:online:${userObjectId}`);
        await redis.del(`sockets:${userObjectId}`);
        console.log('✅ Redis cleanup done');
      } catch (redisErr) {
        console.error('⚠️ Redis cleanup error:', redisErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Account deleted successfully",
      deletedData: {
        matches: deletedMatches.deletedCount,
        swipes: deletedSwipes.deletedCount,
        profile: deletedProfile.deletedCount,
        user: deletedUser.deletedCount
      }
    });

  } catch (err) {
    console.error("❌ Delete account error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};




exports.markAsMarried = async (req, res) => {
  const userId = req.user._id;
    // const profile = await Profile.findOne({ userId });

    // if (!profile) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Profile not found"
    //   });
    // }


  try {
    // 1️⃣ Update user status
    await User.updateOne(
      { _id: userId },
      { accountStatus: "married" }
    );

    // 2️⃣ Disable dating visibility
    await Profile.updateOne(
      { userId },
      {
        isDiscoverable: false,
        canAccessSwipe: false,
        // profile.discovery.globalVisibility: "nobody"
      }
    );

    return res.json({
      success: true,
      message: "Congratulations! Dating features are now disabled."
    });

  } catch (err) {
    console.error("Mark as married error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update account status"
    });
  }
};