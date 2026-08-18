const { Queue } = require('bullmq');

// BullMQ needs an ioredis-shaped {host, port} config — node-redis's
// `.options` is {url, socket} and gets silently ignored by ioredis,
// which then falls back to localhost:6379 with no auth. Same pattern
// already used correctly in workers/notification.worker.js.
const notificationQueue = new Queue('notification-queue', {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
  }
});

const addNotificationJob = async (type, data) => {
  // Hum job add karte waqt "type" bhejenge (LIKE, MATCH, MESSAGE)
 try {
        await notificationQueue.add(type, data, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 }
        });
    } catch (error) {
        console.error('Queue Error:', error);
    }
};

module.exports = { addNotificationJob };