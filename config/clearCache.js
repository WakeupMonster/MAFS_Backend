// utils/cache.js

const { redisClient } = require("./cache");

const clearFeedCache = async (userId) => {
    if (redisClient) {
        const key = `feed:${userId.toString()}`;
        await redisClient.del(key);
        console.log(`[Cache Cleared] -> ${key}`);
    }
};

module.exports = { clearFeedCache };