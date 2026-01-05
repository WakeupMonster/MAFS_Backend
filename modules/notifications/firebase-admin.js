// modules/notifications/firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('../../config/firebase-service-account.json'); // You'll need to create this file

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const sendNotification = async (deviceToken, notification, data = {}) => {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.imageUrl // Optional: for rich notifications
      },
      data: {
        // Any additional data you want to send
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK' // For Flutter to handle notification taps
      },
      token: deviceToken
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

// const sendNotificationToMultiple = async (deviceTokens, notification, data = {}) => {
//   try {
//     const message = {
//       notification: {
//         title: notification.title,
//         body: notification.body,
//         image: notification.imageUrl
//       },
//       data: {
//         ...data,
//         click_action: 'FLUTTER_NOTIFICATION_CLICK'
//       },
//       tokens: deviceTokens
//     };

//     const response = await admin.messaging().sendMulticast(message);
//     console.log('Successfully sent multicast message:', response);
//     return {
//       success: true,
//       successCount: response.successCount,
//       failureCount: response.failureCount,
//       responses: response.responses
//     };
//   } catch (error) {
//     console.error('Error sending multicast message:', error);
//     return { success: false, error: error.message };
//   }
// };


// modules/notifications/firebase-admin.js

const sendNotificationToMultiple = async (deviceTokens, notification, data = {}) => {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.imageUrl
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      tokens: deviceTokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    const failedTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          // In error codes ka matlab hai ki token ab valid nahi hai
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(deviceTokens[idx]);
          }
        }
      });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens // Ye hum worker ko wapas denge delete karne ke liye
    };
  } catch (error) {
    console.error('Error sending multicast message:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
  admin
};