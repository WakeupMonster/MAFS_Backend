/* eslint-disable no-unused-vars */
/* eslint-disable no-dupe-keys */
// Core swipe logic & Redis integration
const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const Swipe = require("./swipe.model"); // may export Swipe and Match - adjust import
const { Match } = require("./swipe.model");
const mongoose = require("mongoose");

let redis;
// Try common redis export paths (adjust to your project)
try {
  redis = require("../../config/cache").redis || require("../../config/redis").redis;
} catch (e) {
  // if not found, require will throw; instruct user to set redis variable later
  redis = null;
}

const SWIPE_QUEUE_PREFIX = "swipe_queue:";     // list of candidate userIds for a user
const SWIPED_SET_PREFIX = "swiped:";           // set of userIds user has swiped
const SWIPE_RATE_PREFIX = "swipe_count:";      // rate limit counter

const DEFAULT_FETCH_LIMIT = 20;
const SWIPE_QUEUE_TTL = 60; // seconds cache lifetime for prefetch

// Helper: build candidate Mongo query for feed
function buildCandidateQuery(myProfile, excludeIds = []) {
  const genderFilter = Array.isArray(myProfile.preferences.genderPreference) && myProfile.preferences.genderPreference.length > 0
    ? { gender: { $in: myProfile.preferences.genderPreference } }
    : {}; // if no pref, don't filter by gender

  const ageMin = myProfile.preferences.ageRange?.min || 18;
  const ageMax = myProfile.preferences.ageRange?.max || 60;
  const now = new Date();
  const maxDob = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
  const minDob = new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate());

  const base = {
    isDiscoverable: true,
    isProfileCompleted: true,
    userId: { $ne: myProfile.userId },
    ...genderFilter,
    dob: { $lte: maxDob, $gte: minDob }
  };

  if (excludeIds && excludeIds.length) base["userId"].$nin = excludeIds;

  return base;
}

// Prefetch candidates into redis list for user
async function prefetchCandidates(userId, myProfile, limit = DEFAULT_FETCH_LIMIT) {
  if (!redis) return [];

  const queueKey = SWIPE_QUEUE_PREFIX + userId;
  // if queue exists return length quickly
  const existing = await redis.lLen(queueKey).catch(() => 0);
  if (existing && existing > 0) {
    // return up to limit without removing (use lrange)
    const ids = await redis.lRange(queueKey, 0, limit - 1);
    return ids;
  }

  // Build exclude list from swiped set and matches
  const swipedSetKey = SWIPED_SET_PREFIX + userId;
  const swipedIds = (await redis.sMembers(swipedSetKey).catch(() => [])) || [];

  // Query DB for candidates
  const query = buildCandidateQuery(myProfile, swipedIds.map(id => mongoose.Types.ObjectId(id)));
  // geospatial near if location present
  if (myProfile.location && Array.isArray(myProfile.location.coordinates) && myProfile.location.coordinates[0] !== 0) {
    query["location.coordinates"] = {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: myProfile.location.coordinates
        },
        $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
      }
    };
  }

  const candidates = await Profile.find(query)
    .limit(limit * 2) // fetch more, we'll filter later
    .select("userId fullName nickname bio photos location dob gender interests")
    .lean();

  // filter out any duplicates or null userId
  const candidateIds = [];
  for (const c of candidates) {
    if (!c.userId) continue;
    const id = c.userId.toString();
    if (candidateIds.includes(id) || swipedIds.includes(id) || id === userId.toString()) continue;
    candidateIds.push(id);
    if (candidateIds.length >= limit) break;
  }

  if (candidateIds.length === 0) return [];

  // push into redis list
  const pushOps = candidateIds.map(id => id);
  await redis.rPush(queueKey, pushOps).catch(() => {});
  // set TTL so queue replenishes later
  await redis.expire(queueKey, SWIPE_QUEUE_TTL).catch(() => {});

  return candidateIds;
}

// Get next candidate(s) (pop from redis queue if possible), fallback to DB
async function getFeed(userId, limit = DEFAULT_FETCH_LIMIT) {
  // load profile (lean)
  const myProfile = await Profile.findOne({ userId }).lean();
  if (!myProfile) throw new Error("Profile not found");

  if (!redis) {
    // No redis: run DB query directly
    const query = buildCandidateQuery(myProfile, []);
    if (myProfile.location && Array.isArray(myProfile.location.coordinates) && myProfile.location.coordinates[0] !== 0) {
      query["location.coordinates"] = {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: myProfile.location.coordinates
          },
          $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
        }
      };
    }
    const results = await Profile.find(query)
      .limit(limit)
      .select("userId fullName nickname bio photos location dob gender interests")
      .lean();
    return results;
  }

  const queueKey = SWIPE_QUEUE_PREFIX + userId;
  // try pop N items without removing permanently (we'll lPop per card when delivered)
  const ids = await redis.lRange(queueKey, 0, limit - 1).catch(() => []);
  if (!ids || ids.length === 0) {
    await prefetchCandidates(userId, myProfile, limit);
  }

  const finalIds = await redis.lRange(queueKey, 0, limit - 1).catch(() => []);
  if (!finalIds || finalIds.length === 0) {
    return []; // nothing found
  }

  // fetch profile details for these ids from DB
  const objIds = finalIds.map(id => mongoose.Types.ObjectId(id));
  const profiles = await Profile.find({ userId: { $in: objIds } })
    .select("userId fullName nickname bio photos location dob gender interests")
    .lean();

  // preserve order of finalIds
  const map = new Map(profiles.map(p => [p.userId.toString(), p]));
  const ordered = finalIds.map(id => map.get(id)).filter(Boolean).slice(0, limit);

  return ordered;
}

// record a swipe and detect match
async function doSwipe(swiperId, targetId, action) {
  // basic validations
  if (swiperId.toString() === targetId.toString()) throw new Error("Cannot swipe self");

  // rate-limiting example (increase if necessary)
  if (redis) {
    const rateKey = SWIPE_RATE_PREFIX + swiperId;
    const count = await redis.incr(rateKey).catch(() => null);
    if (count === 1) await redis.expire(rateKey, 24 * 60 * 60);
    // example: block once count > 1000 per day (adjust to your plan)
    if (count && count > 5000) throw new Error("Rate limit exceeded");
  }

  // try inserting swipe (unique index will prevent duplicate)
  try {
    await Swipe.create({
      swiperId,
      targetId,
      action
    });
  } catch (err) {
    // duplicate swipe triggers E11000 code
    if (err.code === 11000) {
      return { already: true };
    }
    throw err;
  }

  // add to redis swiped set for quick exclusion
  if (redis) await redis.sAdd(SWIPED_SET_PREFIX + swiperId, targetId.toString()).catch(() => {});

  // If action is like/superlike, check reverse like
  if (action === "like" || action === "superlike") {
    // Find if the other user has already liked you
    const reverseSwipe = await Swipe.findOne({
      swiperId: targetId,
      targetId: swiperId,
      action: { $in: ["like", "superlike"] }
    }).lean();

    if (reverseSwipe) {
      // Create match if it doesn't exist
      const user1 = new mongoose.Types.ObjectId(swiperId);
      const user2 = new mongoose.Types.ObjectId(targetId);
      const users = [user1, user2].sort((a, b) => a.toString().localeCompare(b.toString()));

      // Check if match already exists
      let match = await Match.findOne({
        users: { $all: [users[0], users[1]] }
      });

      if (!match) {
        match = await Match.create({
          users: users,
          matchedAt: new Date()
        });
      }

      // remove both from redis queues (best-effort)
      if (redis) {
        await redis.lRem(SWIPE_QUEUE_PREFIX + swiperId, 0, targetId.toString()).catch(()=>{});
        await redis.lRem(SWIPE_QUEUE_PREFIX + targetId, 0, swiperId.toString()).catch(()=>{});
      }

      // return { match: true, match };
       return { match: true, matchId: match._id };
    }
  }
   return { success: true };

  // return { ok: true };
}

// undo last swipe (soft). Simpler API: remove swipe record and redis membership
async function undoSwipe(swiperId, targetId) {
  const res = await Swipe.findOneAndDelete({ swiperId, targetId });
  if (!res) throw new Error("Swipe not found or cannot undo");

  if (redis) {
    await redis.sRem(SWIPED_SET_PREFIX + swiperId, targetId.toString()).catch(()=>{});
    // push back into queue head for user (optional)
    await redis.lPush(SWIPE_QUEUE_PREFIX + swiperId, targetId.toString()).catch(()=>{});
  }
  return { undone: true };
}

module.exports = {
  getFeed,
  doSwipe,
  undoSwipe,
  prefetchCandidates, // export for worker or cron prefetcher
  // constants exported for tests or admin
  SWIPE_QUEUE_PREFIX, SWIPED_SET_PREFIX
};