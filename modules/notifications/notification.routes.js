// modules/notifications/notification.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../auth/auth.middleware");
const notificationController = require("./notification.controller");
const { admin } = require("./firebase-admin");

// const { admin } = require('./firebase-admin');
router.use(auth);
// Register device token for push notifications
router.post("/register-token", notificationController.registerDeviceToken);

// Unregister device token
router.post("/unregister-token", notificationController.unregisterDeviceToken);

// Test notification endpoint
router.post("/test", async (req, res) => {
  try {
    const { token, title = "Test", body = "Hello from server!" } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const notification = {
      title,
      body,
    };

    // Send the notification
    const result = await admin.messaging().send({
      notification,
      token: token,
    });

    res.json({
      success: true,
      message: "Test notification sent!",
      messageId: result,
    });
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test notification",
      error: error.message,
    });
  }
});

// GET /api/v1/notifications/all-notifications
// router.get("/all-notifications", notificationController.getUserNotifications);
router.post("/register-token", notificationController.registerDeviceToken);
// Unregister device token
router.post("/unregister-token", notificationController.unregisterDeviceToken);

router.get("/", notificationController.getNotificationSettings);
router.patch("/", notificationController.updateNotificationSettings);

// Test notification endpoint
// router.post('/test', async (req, res) => {
//   try {
//     const { token, title = 'Test', body = 'Hello from server!' } = req.body;

//     if (!token) {
//       return res.status(400).json({
//         success: false,
//         message: 'Token is required'
//       });
//     }

//     const notification = {
//       title,
//       body
//     };

//     // Send the notification
//     const result = await admin.messaging().send({
//       notification,
//       token: token
//     });

//     res.json({
//       success: true,
//       message: 'Test notification sent!',
//       messageId: result
//     });
//   } catch (error) {
//     console.error('Test notification error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to send test notification',
//       error: error.message
//     });
//   }
// });

module.exports = router;
