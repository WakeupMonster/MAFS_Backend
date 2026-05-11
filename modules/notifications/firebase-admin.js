// modules/notifications/firebase-admin.js
const admin = require('firebase-admin');
const axios = require('axios');

let serviceAccount;

try {
  // SMART FIX: Check environment variable first (for Docker/Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file (for Development)
    serviceAccount = require('../../config/firebase-service-account.json');
  }

  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error("❌ Firebase Initialization Error:", error.message);
  // Don't crash immediately, but log the error
}

const sendNotification = async (deviceToken, notification, data = {}) => {
  try {
    const message = {
      // ⚠️ Using "data-only" payload for frontend navigation
      data: {
        title: notification.title || "",
        body: notification.body || "",
        ...data,
      },
      // ⚡ Android Specific Config
      android: {
        priority: "high",
      },
      // 🍎 iOS Specific Config (APNS)
      apns: {
        payload: {
          aps: {
            "content-available": 1,
            sound: "default",
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
      token: deviceToken,
    };

    // Ensure all data values are strings (FCM requirement for data payload)
    Object.keys(message.data).forEach((key) => {
      if (typeof message.data[key] !== "string") {
        message.data[key] = String(message.data[key]);
      }
    });

    // Production-safe logging (no sensitive data leaked)
    console.log(`📤 Sending push notification: type=${message.data.type}`);

    const response = await admin.messaging().send(message);
    console.log("Successfully sent message (Firebase ID):", response);

    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: error.message };
  }
};

const sendNotificationToMultiple = async (deviceTokens, notification, data = {}) => {
  try {
    const message = {
      // ⚠️ Removed notification object for "data-only" delivery
      data: {
        title: notification.title || "",
        body: notification.body || "",
        ...data,
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            "content-available": 1,
            sound: "default",
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
      tokens: deviceTokens,
    };

    // Ensure all data values are strings
    Object.keys(message.data).forEach((key) => {
      if (typeof message.data[key] !== "string") {
        message.data[key] = String(message.data[key]);
      }
    });

    // Production-safe logging (no sensitive data leaked)
    console.log(`📤 Sending multicast notification: type=${message.data.type}, devices=${deviceTokens.length}`);

    const response = await admin.messaging().sendEachForMulticast(message);

    const failedTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            failedTokens.push(deviceTokens[idx]);
          }
        }
      });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error("Error sending multicast message:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
  admin
};