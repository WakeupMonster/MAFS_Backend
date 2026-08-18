// File: modules/matches/swipe/limits.service.js
const redis = require('../../../config/cache')
const { ApiError } = require('../../../common/errors/ApiError');
const { dateKey, endOfDay } = require('../../../common/utils/time');

class SwipeLimiter {
  constructor() {
    this.redis = redis;
    this.dailyLikesLimit = 1;      // Default daily likes limit
    this.dailySuperlikesLimit = 1;   // Default daily superlikes limit
    this.redisPrefix = 'swipe_limits:';
  }

  // Generate Redis key for user's daily limits
  getUserLimitKey(userId, type) {
    const today = dateKey(); // YYYY-MM-DD in Australia/Sydney
    return `${this.redisPrefix}${userId}:${type}:${today}`;
  }

  // Check and increment the swipe counter
  async checkAndIncrement(userId, action) {
    if (!['like', 'superlike'].includes(action)) {
      return { allowed: true }; // No limit for 'pass' action
    }

    const type = action === 'like' ? 'likes' : 'superlikes';
    const limit = type === 'likes' ? this.dailyLikesLimit : this.dailySuperlikesLimit;
    const key = this.getUserLimitKey(userId, type);
    
    try {
      // Use Redis INCR to atomically increment and get the new value
      const count = await this.redis.incr(key);
      
      // If this is the first time setting the key, set expiry to end of day
      if (count === 1) {
        const now = new Date();
        const ttlSeconds = Math.ceil((endOfDay(now) - now) / 1000);
        await this.redis.expire(key, ttlSeconds);
      }

      const remaining = Math.max(0, limit - count);
      const resetTime = await this.redis.ttl(key);
      
      return {
        allowed: count <= limit,
        count,
        remaining,
        limit,
        resetTime: Math.floor(Date.now() / 1000) + resetTime
      };
    } catch (error) {
      console.error('Redis error in checkAndIncrement:', error);
      // Fail open in case of Redis issues
      return { allowed: true, error: 'rate_limit_unavailable' };
    }
  }

  // Get current usage
  async getUsage(userId) {
    try {
      const likesKey = this.getUserLimitKey(userId, 'likes');
      const superlikesKey = this.getUserLimitKey(userId, 'superlikes');
      
      const [likesCount, superlikesCount, likesTTL, superlikesTTL] = await Promise.all([
        this.redis.get(likesKey).then(v => parseInt(v, 10) || 0),
        this.redis.get(superlikesKey).then(v => parseInt(v, 10) || 0),
        this.redis.ttl(likesKey),
        this.redis.ttl(superlikesKey)
      ]);

      const now = Math.floor(Date.now() / 1000);
      
      return {
        likes: {
          used: likesCount,
          remaining: Math.max(0, this.dailyLikesLimit - likesCount),
          limit: this.dailyLikesLimit,
          resetTime: likesTTL > 0 ? now + likesTTL : null
        },
        superlikes: {
          used: superlikesCount,
          remaining: Math.max(0, this.dailySuperlikesLimit - superlikesCount),
          limit: this.dailySuperlikesLimit,
          resetTime: superlikesTTL > 0 ? now + superlikesTTL : null
        }
      };
    } catch (error) {
      console.error('Redis error in getUsage:', error);
      throw new ApiError('Failed to get swipe limits', 500);
    }
  }

  // Admin function to update limits (optional)
  async updateLimits(userId, { dailyLikes, dailySuperlikes }) {
    // In a real app, you'd want to persist these in the database
    // and cache them in Redis
    if (dailyLikes !== undefined) {
      this.dailyLikesLimit = dailyLikes;
    }
    if (dailySuperlikes !== undefined) {
      this.dailySuperlikesLimit = dailySuperlikes;
    }
    return this.getUsage(userId);
  }
}

module.exports = new SwipeLimiter();