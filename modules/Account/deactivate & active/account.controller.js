const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const {
  invalidateUserFeedCache,
} = require("../../../common/utils/feedCache.util");

// const mongoose = require('mongoose');

const { Match } = require("../../../modules/matches/swipe/swipe.model");
const Swipe = require("../../../modules/matches/swipe/swipe.model");
const Message = require("../../../modules/matches/chat/chat.message.model");
const ChatRoom = require("../../matches/chat/chat.room.model");
const redis = require("../../../config/cache");
const getFormattedUser = require("../../../common/utils/getFormattedUser");

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otp, reason } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason is required",
      });
    }

    // const user = await User.findById(userId);
    const user = await User.findById(userId).select(
      "+deleteAccountOtp +deleteAccountOtpExpires"
    );

    // console.log(user.deleteAccountOtp);
    // console.log(otp);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // verify OTP
    if (
      user.deleteAccountOtp !== otp ||
      user.deleteAccountOtpExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const now = new Date();

    const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const diffMs = deletionDate - now;

    const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    await Promise.all([
      // update user
      User.updateOne(
        { _id: userId },
        {
          $set: {
            accountStatus: "deleted",

            deletionDetails: {
              isScheduledForDeletion: true,
              scheduledAt: now,
              deletionDate: deletionDate,
              reason: reason.trim(),
              daysRemaining: daysRemaining,
            },

            deleteAccountOtp: null,
            deleteAccountOtpExpires: null,

            fcmTokens: [],
          },
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
            "settings.notifications.messages": false,
          },
        }
      ),

      // clear redis cache
      redis?.del(`feed:${userId}`),
      redis?.del(`user:online:${userId}`),
      redis?.del(`socket:${userId}`),
    ]);

    const formattedUser = await getFormattedUser(userId, req);

    return res.json({
      success: true,
      message: "Account scheduled for deletion",
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    console.error("Delete account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};

exports.permanentDeleteAccounts = async () => {
  try {
    const now = new Date();

    const users = await User.find({
      "deletionDetails.isScheduledForDeletion": true,
      "deletionDetails.scheduledAt": { $lt: now },
    }).select("_id");

    if (!users.length) {
      console.log("No accounts to permanently delete");
      return;
    }

    const userIds = users.map((u) => u._id);

    console.log("Permanent deleting users:", userIds);

    await Promise.all([
      Match.deleteMany({
        users: { $in: userIds },
      }),

      Swipe.deleteMany({
        $or: [{ swiperId: { $in: userIds } }, { targetId: { $in: userIds } }],
      }),

      ChatRoom.deleteMany({
        participants: { $in: userIds },
      }),

      Message.deleteMany({
        senderId: { $in: userIds },
      }),

      Profile.deleteMany({
        userId: { $in: userIds },
      }),

      User.deleteMany({
        _id: { $in: userIds },
      }),
    ]);

    // clear redis cache
    await Promise.all(
      userIds.map((id) =>
        Promise.all([
          redis?.del(`feed:${id}`),
          redis?.del(`user:online:${id}`),
          redis?.del(`socket:${id}`),
        ])
      )
    );

    console.log("Permanent delete completed");
  } catch (error) {
    console.error("Permanent delete error:", error);
  }
};

exports.markAsMarried = async (req, res) => {
  const userId = req.user._id;

  try {
    // 1️⃣ Update user status
    await User.updateOne({ _id: userId }, { accountStatus: "married" });

    // 2️⃣ Disable dating visibility
    await Profile.updateOne(
      { userId },
      {
        isDiscoverable: false,
        canAccessSwipe: false,
        // profile.discovery.globalVisibility: "nobody"
      }
    );

    const formattedUser = await getFormattedUser(userId, req);
    return res.json({
      success: true,
      message: "Congratulations! Dating features are now disabled.",
      data: {
        user: formattedUser,
      },
    });
  } catch (err) {
    console.error("Mark as married error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update account status",
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
        message: "Deactivation reason is required",
      });
    }

    const profile = await Profile.findOne({ userId }).select("_id");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
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
          "settings.notifications.messages": false,
        },
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
            deactivatedAt: now,
          },

          // remove push tokens
          fcmTokens: [],
        },
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
      invalidateFeedPromise,
    ]);

    const formattedUser = await getFormattedUser(userId, req);

    return res.json({
      success: true,
      message: "Account deactivated successfully",
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    console.error("Deactivate error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate account",
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
        message: "Profile not found",
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
          "settings.notifications.messages": true,
        },
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
            deactivatedAt: null,
          },
        },
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
      invalidateFeedPromise,
    ]);

    const formattedUser = await getFormattedUser(userId, req);

    return res.json({
      success: true,
      message: "Account reactivated successfully",
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    console.error("Reactivate error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reactivate account",
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
        message: "User not found",
      });
    }

    if (user.accountStatus === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Account already scheduled for deletion",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          deleteAccountOtp: otp,
          deleteAccountOtpExpires: expiry,
        },
      }
    );

    console.log("Delete Account OTP:", otp);

    const formattedUser = await getFormattedUser(userId, req);

    // 7️⃣ Response
    return res.json({
      success: true,
      message: `Delete account OTP sent successfully : ${otp}`,
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    console.error("Request delete OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send delete OTP",
    });
  }
};

exports.restoreAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // check if account is actually deleted
    if (!user.deletionDetails?.isScheduledForDeletion) {
      return res.status(400).json({
        success: false,
        message: "Account is not scheduled for deletion",
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
              scheduledAt: null,
            },
          },
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
            "settings.notifications.messages": true,
          },
        }
      ),

      // clear redis cache
      redis?.del(`feed:${userId}`),
      redis?.del(`user:online:${userId}`),
      redis?.del(`socket:${userId}`),
    ]);
    const formattedUser = await getFormattedUser(userId, req);
    return res.json({
      success: true,
      message: "Account restored successfully",
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    console.error("Restore account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to restore account",
    });
  }
};
