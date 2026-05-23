// modules/notifications/notification.controller.js
const User = require("../auth/auth.model");
// const Profile = require("../profile/profile.model");

const registerDeviceToken = async (req, res) => {
  try {
    // const { userId } = req.user;
    const userId = req.user._id;

    const { token, deviceId, platform } = req.body;

    if (!token || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Token and deviceId are required",
      });
    }

    // 1. Remove any existing entry for this specific deviceId to prevent duplicates
    // This ensures one deviceId has only one token at any time.
    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { deviceId } },
    });

    // 2. Add the new token + platform
    await User.findByIdAndUpdate(userId, {
      $push: {
        fcmTokens: { token, deviceId, platform: platform || "android" },
      },
    });

    return res.json({
      success: true,
      message: "Device token registered successfully",
    });
  } catch (error) {
    console.error("Error registering device token:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register device token",
      error: error.message,
    });
  }
};

const unregisterDeviceToken = async (req, res) => {
  try {
    // const { userId } = req.user;
    const userId = req.user._id;
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    // Remove the token for the given device
    await User.findByIdAndUpdate(userId, {
      $pull: {
        fcmTokens: { deviceId },
      },
    });

    return res.json({
      success: true,
      message: "Device token unregistered successfully",
    });
  } catch (error) {
    console.error("Error unregistering device token:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unregister device token",
      error: error.message,
    });
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { push, email, matches, messages, likes } = req.body;

    const update = {};

    if (push !== undefined) {
      update["notificationSettings.push"] = push;
    }

    if (email !== undefined) {
      update["notificationSettings.email"] = email;
    }

    if (matches !== undefined) {
      update["notificationSettings.matches"] = matches;
    }

    if (messages !== undefined) {
      update["notificationSettings.messages"] = messages;
    }

    if (likes !== undefined) {
      update["notificationSettings.likes"] = likes;
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Apply updates
    Object.keys(update).forEach((key) => {
      const field = key.split(".")[1];
      user.notificationSettings[field] = update[key];
    });

    // Push to auditLogs
    user.auditLogs.push({
      action: "settings_update",
      reason: "User updated notification settings",
      actedBy: userId, // Self-action
      actedAt: new Date(),
      details: { updatedSettings: update },
    });

    await user.save();

    return res.json({
      success: true,
      message: "Notification settings updated",
      data: user.notificationSettings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// const updateNotificationSettings = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const body = req.body;
//     const update = {};

//     if (push !== undefined) {
//       update["notificationSettings.push"] = push;
//     }

//     if (email !== undefined) {
//       update["notificationSettings.email"] = email;
//     }

//     if (matches !== undefined) {
//       update["notificationSettings.matches"] = matches;
//     }

//     if (messages !== undefined) {
//       update["notificationSettings.messages"] = messages;
//     }

//     if (likes !== undefined) {
//       update["notificationSettings.likes"] = likes;
//     }

//     const user = await User.findByIdAndUpdate(
//       userId,
//       { $set: update },
//       { new: true },
//     ).select("notificationSettings");

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // 1. Update User Collection
//     if (!user.notificationSettings) user.notificationSettings = {};

//     const toBool = (val) => {
//       if (val === "true" || val === true || val === 1 || val === "1") return true;
//       if (val === "false" || val === false || val === 0 || val === "0") return false;
//       return undefined;
//     };

//     const fields = ['push', 'email', 'matches', 'messages', 'likes'];
//     let hasChanges = false;
//     const profileUpdate = {};

//     fields.forEach(field => {
//       if (settings[field] !== undefined) {
//         const boolVal = toBool(settings[field]);
//         if (boolVal !== undefined) {
//           user.notificationSettings[field] = boolVal;
//           // Prepare update for Profile collection as well (using their field name 'notifications')
//           profileUpdate[`notifications.${field}`] = boolVal;
//           hasChanges = true;
//         }
//       }
//     });

//     if (hasChanges) {
//       // Save to User
//       user.markModified('notificationSettings');
//       await user.save();

//       // 2. Sync to Profile Collection
//       await Profile.findOneAndUpdate(
//         { userId: userId },
//         { $set: profileUpdate }
//       );
//     }

//     return res.json({
//       success: true,
//       message: "Notification settings updated",
//       data: user.notificationSettings,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("notificationSettings")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user.notificationSettings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  getNotificationSettings,
  updateNotificationSettings,
};
