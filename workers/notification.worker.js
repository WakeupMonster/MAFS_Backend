// const { Worker } = require('bullmq');
// const notificationService = require('../modules/notifications/notification.service');
// const { redisClient } = require('../config/cache');

// const worker = new Worker('notification-queue', async (job) => {
//   const { type, data } = job;
  
//   console.log(`🚀 Processing ${type} for job ${job.id}`);

//   try {
//     switch (type) {
//       case 'NEW_MATCH':
//         await notificationService.sendNewMatchNotification(data.userId1, data.userId2);
//         break;
//       case 'NEW_MESSAGE':
//         await notificationService.sendNewMessageNotification(data.senderId, data.receiverId, data.messageText);
//         break;
//       case 'NEW_LIKE':
//         await notificationService.sendLikeNotification(data.senderId, data.receiverId);
//         break;
//       case 'GIVEAWAY_WINNER':
//         await notificationService.sendGiveawayWinnerNotification(data.userId, data.prizeTitle);
//         break;
//       default:
//         console.warn(`Unknown notification type: ${type}`);
//     }
//   } catch (error) {
//     console.error(`Worker Error in ${type}:`, error);
//     throw error; // Isse BullMQ auto-retry karega
//   }
// }, { 
//   connection: redisClient.options,
//   concurrency: 10 // Ek saath 10 notifications process karega
// });

// module.exports = worker;


const { Worker } = require('bullmq');
// const notificationService = require('./notification.service');
const notificationService = require('../modules/notifications/notification.service');

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
};

const worker = new Worker('notification-queue', async (job) => {
    const { type } = job.name; // Job name as type
    const data = job.data;

    console.log(`Processing ${job.name} for Job ID: ${job.id}`);

    try {
        switch (type) {
            case 'NEW_MATCH':
                await notificationService.sendNewMatchNotification(data.userId1, data.userId2);
                break;
            case 'NEW_MESSAGE':
                await notificationService.sendNewMessageNotification(data.senderId, data.receiverId, data.messageText);
                break;
            case 'NEW_LIKE':
                await notificationService.sendLikeNotification(data.senderId, data.receiverId);
                break;
            case 'GIVEAWAY_WINNER':
                await notificationService.sendGiveawayWinnerNotification(data.userId, data.prizeTitle);
                break;
            case 'PRIZE_DELIVERED':
                await notificationService.sendPrizeDeliveredNotification(data.userId);
                break;
            default:
                console.warn(`No handler for ${job.name}`);
        }
    } catch (error) {
        console.error(`Worker Error: ${error.message}`);
        throw error;
    }
}, { connection, concurrency: 10 });

module.exports = worker;