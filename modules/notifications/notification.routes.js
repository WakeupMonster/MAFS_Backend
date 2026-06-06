// modules/notifications/notification.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../auth/auth.middleware');
const notificationController = require('./notification.controller');
const { apiLimiter } = require("../../common/middlewares/apiLimiter");
// const { admin } = require('./firebase-admin');
router.use(auth);
// Register device token for push notifications
router.post('/register-token', apiLimiter("notif_register", 10, 300), notificationController.registerDeviceToken); // 10 req / 5 mins
// Unregister device token
router.delete('/unregister-token', apiLimiter("notif_unregister", 10, 60), notificationController.unregisterDeviceToken);
router.get("/", apiLimiter("notif_settings_read", 20, 60), notificationController.getNotificationSettings);
router.patch("/", apiLimiter("notif_settings_update", 10, 60), notificationController.updateNotificationSettings);
module.exports = router;