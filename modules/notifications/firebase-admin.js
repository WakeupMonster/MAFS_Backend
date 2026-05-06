// modules/notifications/firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('../../config/firebase-service-account.json'); // You'll need to create this file
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
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

    // 🔔 NTFY.SH INTERCEPTOR & CONSOLE LOG (Moved to top for debugging)
    // This will fire even if Firebase credentials fail later
    console.log(`\n=== SENDING PUSH NOTIFICATION (${message.data.type}) ===`);
    console.log(JSON.stringify(message.data, null, 2));
    console.log("=========================================================\n");

    axios
      .post("https://ntfy.sh/my-test-notifications", {
        topic: "my-test-notifications",
        title: `🔔 PUSH: ${message.data.type}`,
        message: JSON.stringify(message.data, null, 2),
        priority: 4,
        tags: ["push", "debug"],
      })
      .catch((err) => console.error("Ntfy intercept failed:", err.message));

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

    // 🔔 NTFY.SH INTERCEPTOR & CONSOLE LOG (Moved to top for debugging)
    console.log(`\n=== SENDING MULTICAST NOTIFICATION (${message.data.type}) ===`);
    console.log(`To ${deviceTokens.length} devices.`);
    console.log(`\n📦 FULL FCM PAYLOAD BEING SENT:`);
    console.log(JSON.stringify({ message: { token: deviceTokens[0], data: message.data, android: message.android, apns: message.apns } }, null, 2));
    console.log("============================================================\n");

    axios
      .post("https://ntfy.sh/my-test-notifications", {
        topic: "my-test-notifications",
        title: `🔔 MULTICAST: ${message.data.type}`,
        message: JSON.stringify(message.data, null, 2),
        priority: 4,
        tags: ["push", "multicast"],
      })
      .catch((err) => console.error("Ntfy intercept failed:", err.message));

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