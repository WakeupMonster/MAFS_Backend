// modules/notifications/notification.controller.js
const User = require('../auth/auth.model');
const Profile = require("../profile/profile.model");
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
      message: 'Device token registered successfully'
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register device token',
      error: error.message
    });
  }
};

const unregisterDeviceToken = async (req, res) => {
  try {
    const { userId } = req.user;
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId is required'
      });
    }

    // Remove the token for the given device
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          fcmTokens: { deviceId }
        }
      }
    );

    return res.json({
      success: true,
      message: 'Device token unregistered successfully'
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unregister device token',
      error: error.message
    });
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { push, email, matches, messages, likes } = req.body;

    // Helper to handle "true"/"false" strings from frontend
    const toBool = (val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    };

    const update = {};

    if (push !== undefined) {
      update["notificationSettings.push"] = toBool(push);
    }

    if (email !== undefined) {
      update["notificationSettings.email"] = toBool(email);
    }

    if (matches !== undefined) {
      update["notificationSettings.matches"] = toBool(matches);
    }

    if (messages !== undefined) {
      update["notificationSettings.messages"] = toBool(messages);
    }

    if (likes !== undefined) {
      update["notificationSettings.likes"] = toBool(likes);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    ).select("notificationSettings");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: "Notification settings updated",
      data: user.notificationSettings
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("notificationSettings")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      data: user.notificationSettings
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  getNotificationSettings,
  updateNotificationSettings
};