const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const { invalidateUserFeedCache } = require("../../../common/utils/feedCache.util");




// const mongoose = require('mongoose');


const {Match} = require("../../../modules/matches/swipe/swipe.model");
const Swipe = require("../../../modules/matches/swipe/swipe.model");
const Message = require("../../../modules/matches/chat/chat.message.model");
const ChatRoom = require("../../matches/chat/chat.room.model");
const redis = require("../../../config/cache");



exports.deleteAccount = async (req, res) => {

  try {

    const userId = req.user._id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required"
      });
    }

    // const user = await User.findById(userId);
    const user = await User.findById(userId)
  .select("+deleteAccountOtp +deleteAccountOtpExpires");


    console.log(user.deleteAccountOtp)
    console.log(otp)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // verify OTP
    if (
      user.deleteAccountOtp !== otp ||
      user.deleteAccountOtpExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const now = new Date();

    // 30 days grace period
    const permanentDeleteAt = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    await Promise.all([

      // update user
      User.updateOne(
        { _id: userId },
        {
          $set: {

            accountStatus: "deleted",

            deletionDetails: {
              isScheduledForDeletion: true,
              scheduledAt: permanentDeleteAt
            },

            deleteAccountOtp: null,
            deleteAccountOtpExpires: null,

            fcmTokens: []

          }
        }
      ),

      // hide profile + disable notifications
      Profile.updateOne(
        { userId },
        {
          $set: {

            "discovery.globalVisibility": "nobody",

            "settings.notifications.push": false,
            "settings.notifications.email": false,
            "settings.notifications.matches": false,
            "settings.notifications.messages": false

          }
        }
      ),

      // clear redis cache
      redis?.del(`feed:${userId}`),
      redis?.del(`user:online:${userId}`),
      redis?.del(`socket:${userId}`)

    ]);

    return res.json({
      success: true,
      message: "Account scheduled for deletion",
      permanentDeleteAt
    });

  } catch (error) {

    console.error("Delete account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete account"
    });

  }

};

exports.permanentDeleteAccounts = async () => {

  try {

    const now = new Date();

    const users = await User.find({
      "deletionDetails.isScheduledForDeletion": true,
      "deletionDetails.scheduledAt": { $lt: now }
    }).select("_id");

    if (!users.length) {
      console.log("No accounts to permanently delete");
      return;
    }

    const userIds = users.map(u => u._id);

    console.log("Permanent deleting users:", userIds);

    await Promise.all([

      Match.deleteMany({
        users: { $in: userIds }
      }),

      Swipe.deleteMany({
        $or: [
          { swiperId: { $in: userIds } },
          { targetId: { $in: userIds } }
        ]
      }),

      ChatRoom.deleteMany({
        participants: { $in: userIds }
      }),

      Message.deleteMany({
        senderId: { $in: userIds }
      }),

      Profile.deleteMany({
        userId: { $in: userIds }
      }),

      User.deleteMany({
        _id: { $in: userIds }
      })

    ]);

    // clear redis cache
    await Promise.all(
      userIds.map(id =>
        Promise.all([
          redis?.del(`feed:${id}`),
          redis?.del(`user:online:${id}`),
          redis?.del(`socket:${id}`)
        ])
      )
    );

    console.log("Permanent delete completed");

  } catch (error) {

    console.error("Permanent delete error:", error);

  }

};





// exports.deleteAccount = async (req, res) => {
//   const userId = req.user._id;

//   try {
//     // Convert to ObjectId
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

//     // 2. Delete matches - MongoDB shell mein jo query kaam kari wahi use karo
//     const deletedMatches = await Match.deleteMany({
//       users: userObjectId
//     });

//     console.log(`✅ Deleted ${deletedMatches.deletedCount} matches`);

//     // 3. Delete swipes
//     const deletedSwipes = await Swipe.deleteMany({
//       $or: [
//         { swiperId: userObjectId },
//         { targetId: userObjectId }
//       ]
//     });
    
//     console.log(`✅ Deleted ${deletedSwipes.deletedCount} swipes`);

//     // 4. Delete profile
//     const deletedProfile = await Profile.deleteOne({ 
//       userId: userObjectId 
//     });
    
//     console.log(`✅ Deleted profile:`, deletedProfile.deletedCount);

//     // 5. Delete user
//     const deletedUser = await User.deleteOne({ 
//       _id: userObjectId 
//     });
    
//     console.log(`✅ Deleted user:`, deletedUser.deletedCount);

//       if (redis) {
//                  const CACHE_KEY = `feed:${userId.toString()}`;
//                  await redis.del(CACHE_KEY);
//                  console.log("Redis cache cleared for new filters");
//              }

//     // 6. Redis cleanup
//     if (redis?.isOpen) {
//       try {
//         await redis.del(`feed:${userObjectId.toString()}`);
//         await redis.del(`user:online:${userObjectId}`);
//         await redis.del(`sockets:${userObjectId}`);
//         console.log('✅ Redis cleanup done');
//       } catch (redisErr) {
//         console.error('⚠️ Redis cleanup error:', redisErr.message);
//       }
//     }

//     return res.json({
//       success: true,
//       message: "Account deleted successfully",
//       deletedData: {
//         matches: deletedMatches.deletedCount,
//         swipes: deletedSwipes.deletedCount,
//         profile: deletedProfile.deletedCount,
//         user: deletedUser.deletedCount
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


exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Deactivation reason is required"
      });
    }

    const profile = await Profile.findOne({ userId }).select("_id");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    const now = new Date();

    // Prepare parallel operations
    const profileUpdatePromise = Profile.updateOne(
      { userId },
      {
        $set: {

          // Hide profile from discovery
          "discovery.globalVisibility": "nobody",

          // Disable ALL notifications
          "settings.notifications.push": false,
          "settings.notifications.email": false,
          "settings.notifications.matches": false,
          "settings.notifications.messages": false

        }
      }
    );

    const userUpdatePromise = User.updateOne(
      { _id: userId },
      {
        $set: {

          accountStatus: "deactivated",

          deactivationDetails: {
            isDeactivated: true,
            reason: reason.trim(),
            deactivatedAt: now
          },

          // remove push tokens
          fcmTokens: []

        }
      }
    );

    const redisPromise = redis
      ? redis.del(`feed:${userId.toString()}`)
      : Promise.resolve();

    const invalidateFeedPromise = invalidateUserFeedCache();

    // Execute ALL in parallel (FAST ⚡)
    await Promise.all([
      profileUpdatePromise,
      userUpdatePromise,
      redisPromise,
      invalidateFeedPromise
    ]);

    return res.json({
      success: true,
      message: "Account deactivated successfully"
    });

  } catch (error) {

    console.error("Deactivate error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate account"
    });
  }
};



exports.reactivateAccount = async (req, res) => {
  try {

    const userId = req.user._id;

    const profile = await Profile.findOne({ userId }).select("_id");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    const profileUpdatePromise = Profile.updateOne(
      { userId },
      {
        $set: {

          "discovery.globalVisibility": "everyone",

          // Restore default notifications
          "settings.notifications.push": true,
          "settings.notifications.email": false,
          "settings.notifications.matches": true,
          "settings.notifications.messages": true

        }
      }
    );

    const userUpdatePromise = User.updateOne(
      { _id: userId },
      {
        $set: {

          accountStatus: "active",

          deactivationDetails: {
            isDeactivated: false,
            reason: null,
            deactivatedAt: null
          }

        }
      }
    );

    const redisPromise = redis
      ? redis.del(`feed:${userId.toString()}`)
      : Promise.resolve();

    const invalidateFeedPromise = invalidateUserFeedCache();

    await Promise.all([
      profileUpdatePromise,
      userUpdatePromise,
      redisPromise,
      invalidateFeedPromise
    ]);

    return res.json({
      success: true,
      message: "Account reactivated successfully"
    });

  } catch (error) {

    console.error("Reactivate error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reactivate account"
    });
  }
};





exports.requestDeleteAccountOtp = async (req, res) => {

  try {

    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.accountStatus === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Account already scheduled for deletion"
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const expiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          deleteAccountOtp: otp,
          deleteAccountOtpExpires: expiry
        }
      }
    );



    console.log("Delete Account OTP:", otp);

    // 7️⃣ Response
    return res.json({
      success: true,
      message: "Delete account OTP sent successfully",
      otp : `Your otp for account deletion is : ${otp}`
    });

  } catch (error) {

    console.error("Request delete OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send delete OTP"
    });

  }

};


exports.restoreAccount = async (req, res) => {

  try {

    const userId = req.user._id;

    console.log("hy")

    // find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // check if account is actually deleted
    if (!user.deletionDetails?.isScheduledForDeletion) {
      return res.status(400).json({
        success: false,
        message: "Account is not scheduled for deletion"
      });
    }

    await Promise.all([

      // restore user
      User.updateOne(
        { _id: userId },
        {
          $set: {

            accountStatus: "active",

            deletionDetails: {
              isScheduledForDeletion: false,
              scheduledAt: null
            }

          }
        }
      ),

      // restore profile visibility and notifications
      Profile.updateOne(
        { userId },
        {
          $set: {

            "discovery.globalVisibility": "everyone",

            "settings.notifications.push": true,
            "settings.notifications.email": false,
            "settings.notifications.matches": true,
            "settings.notifications.messages": true

          }
        }
      ),

      // clear redis cache
      redis?.del(`feed:${userId}`),
      redis?.del(`user:online:${userId}`),
      redis?.del(`socket:${userId}`)

    ]);

    return res.json({
      success: true,
      message: "Account restored successfully"
    });

  } catch (error) {

    console.error("Restore account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to restore account"
    });

  }

};
