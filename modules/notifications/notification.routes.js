// modules/notifications/notification.routes.js
const express = require('express');
const router = express.Router();
const auth  = require('../auth/auth.middleware');
const notificationController = require('./notification.controller');
// const { admin } = require('./firebase-admin');
router.use(auth);
// Register device token for push notifications
router.post('/register-token',  notificationController.registerDeviceToken);
// Unregister device token
// router.post('/unregister-token',  notificationController.unregisterDeviceToken); // Merged into /auth/logout
router.get("/", notificationController.getNotificationSettings);
router.patch("/", notificationController.updateNotificationSettings);
module.exports = router;