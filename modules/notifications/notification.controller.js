// modules/notifications/notification.controller.js
const User = require('../auth/auth.model');
const Profile = require("../profile/profile.model");
const registerDeviceToken = async (req, res) => {
  try {
    // const { userId } = req.user;
    const userId = req.user._id;

    const { token, deviceId } = req.body;

    if (!token || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Token and deviceId are required'
      });
    }

    // Add the new token to the user's fcmTokens array
    // Using $addToSet to prevent duplicates
    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          fcmTokens: { token, deviceId }
        }
      }
    );

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