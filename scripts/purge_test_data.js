const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const User = require('../modules/auth/auth.model');

// --- CONFIGURATION ---
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const MONGO_URI = process.env.MONGODB_URI; // Make sure this is in your .env

const redis = new Redis(REDIS_URL);

/**
 * purge_test_data.js
 * Usage: node scripts/purge_test_data.js [--hard]
 */

const isHardMode = process.argv.includes('--hard');

async function cleanup() {
  try {
    console.log(`🧹 Starting cleanup in ${isHardMode ? 'HARD' : 'SOFT'} mode...`);
    
    // Connect to Mongo
    if (!MONGO_URI) throw new Error("MONGODB_URI missing in .env");
    await mongoose.connect(MONGO_URI);

    // 1. Redis Cleanup (+1000 range)
    const keys = await redis.keys('*+1000*');
    const rlKeys = await redis.keys('rl:login:*'); // Clean rate limits too
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} phone OTP keys from Redis.`);
    }
    if (rlKeys.length > 0) {
      await redis.del(...rlKeys);
      console.log(`✅ Cleared ${rlKeys.length} rate-limit keys from Redis.`);
    }

    // 2. MongoDB Cleanup (Test users: matched by flag OR +1000 prefix)
    const testQuery = { 
      $or: [
        { isTest: true }, 
        { phone: { $regex: /^\+1000/ } } 
      ] 
    };

    if (isHardMode) {
      const result = await User.deleteMany(testQuery);
      console.log(`🔥 [HARD] Deleted ${result.deletedCount} test users from MongoDB.`);
    } else {
      // Soft cleanup: Keep users, wipe their sessions/history
      const result = await User.updateMany(
        testQuery,
        { 
          $set: { 
            refreshTokens: [], 
            loginHistory: [], 
            sessions: [],
            isPhoneVerified: false,
            lastLoginAt: null
          } 
        }
      );
      console.log(`✅ [SOFT] Reset sessions/history for ${result.modifiedCount} test users.`);
    }

    console.log('✨ Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
