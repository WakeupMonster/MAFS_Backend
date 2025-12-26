/* eslint-disable no-unused-vars */
/* eslint-disable no-dupe-keys */
// Core swipe logic & Redis integration
const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const Swipe = require("./swipe.model"); // may export Swipe and Match - adjust import
const { Match } = require("./swipe.model");
const mongoose = require("mongoose");
const userActionsModel = require("./BlockReport/userActions.model");
const redis = require("../../../config/cache");
const BlockedContact = require("../../BlockedContact/blockedContacts.model");


// let redis;
// try {
//   redis = require("../../config/cache").redis || require("../../config/redis").redis;
// } catch (e) {
//   redis = null;
// }

const SWIPE_QUEUE_PREFIX = "swipe_queue:";     // list of candidate userIds for a user
const SWIPED_SET_PREFIX = "swiped:";           // set of userIds user has swiped
const SWIPE_RATE_PREFIX = "swipe_count:";      // rate limit counter

const DEFAULT_FETCH_LIMIT = 20;
const SWIPE_QUEUE_TTL = 60; // seconds cache lifetime for prefetch

function buildCandidateQuery(myProfile, excludeIds = []) {
  // Gender filter
  const genderFilter = myProfile.preferences?.genderPreference?.length > 0
    ? { gender: { $in: myProfile.preferences.genderPreference } }
    : {};

  // Age filter
  const ageMin = myProfile.preferences?.ageRange?.min || 18;
  const ageMax = myProfile.preferences?.ageRange?.max || 60;
  const now = new Date();
  const maxDob = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
  const minDob = new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate());

  return {
    isDiscoverable: true,
    isProfileCompleted: true,
    userId: {
      $ne: myProfile.userId,
      $nin: excludeIds
    },
    ...genderFilter,
    dob: { $lte: maxDob, $gte: minDob }
  };
}

async function prefetchCandidates(userId, myProfile, limit, blockedUserIds = []) {
  try {
    const queueKey = SWIPE_QUEUE_PREFIX + userId;

    // Build query to find potential candidates
    const query = buildCandidateQuery(myProfile, blockedUserIds);

    // Add location filter if available
    if (myProfile.location?.coordinates?.length > 0) {
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

    // Find candidates not in redis already
    const existingIds = await redis.lRange(queueKey, 0, -1).catch(() => []);
    if (existingIds.length > 0) {
      query._id = { $nin: existingIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    // Fetch candidates from DB
    const candidates = await Profile.find(query)
      .limit(limit * 2) // Fetch more to account for filtering
      .select("_id")
      .lean();

    if (candidates.length === 0) return [];

    // Add new candidates to Redis queue
    const newIds = candidates.map(c => c._id.toString());
    if (newIds.length > 0) {
      await redis.lPush(queueKey, newIds);
      await redis.expire(queueKey, SWIPE_QUEUE_TTL);
    }

    return newIds;
  } catch (error) {
    console.error('Error in prefetchCandidates:', error);
    return [];
  }
}

async function getFeedService(userId, limit = 20) {
  const CACHE_KEY = `feed:${userId.toString()}`;
  const CACHE_TTL = 300; // 5 minutes

  console.log(CACHE_KEY, "cache key");

  // ===============================
  // STEP 1️⃣: Redis se feed try karo
  // ===============================
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        console.log("✅ FEED FROM REDIS");
        const parsed = JSON.parse(cached);
        return {
          data: parsed.data || parsed, // ✅ backward compatible
          cached: true
        };
      }
    } catch (err) {
      console.error("❌ Redis GET error:", err);
    }
  }

  console.log("❌ REDIS MISS → DB SE FEED");

  // ================================
  // STEP 2️⃣: Current user ka profile
  // ================================
  const myProfile = await Profile.findOne({ userId })
    .select("preferences location interests discoveryFilters isDiscoverable")
    .lean();

  if (!myProfile) throw new Error("Profile not found");

  // ================================
  // STEP 3️⃣: Superlikes nikalo 
  // ================================
  const superlikes = await Swipe.find({
    targetId: userId,
    action: "superlike"
  }).select("swiperId").lean();

  const superlikeSet = new Set(
    superlikes.map(s => s.swiperId.toString())
  );

  // ================================
  // STEP 4️⃣: Swipes + Matches + Block
  // ================================
  const swipes = await Swipe.find({
    swiperId: userId,
    action: { $in: ["like", "pass"] }
  }).select("targetId").lean();

  const matches = await Match.find({
    users: userId
  }).select("users").lean();

  const matchedIds = matches
    .flatMap(m => m.users)
    .map(id => id.toString())
    .filter(id => id !== userId.toString());

  const blocked = await userActionsModel.find({
    $or: [
      { actorId: userId, actionType: { $in: ["block", "report"] } },
      { targetId: userId, actionType: "block" }
    ]
  }).distinct("targetId");

  // 🔹 Step 4.1: phone ke basis par blocked contacts lao
  const blockedPhoneHashes = await BlockedContact.find({
    userId
  }).distinct("blockedPhoneHash");

  // 🔹 Step 4.2: un phone hashes se users nikaalo
  let blockedUserIdsByPhone = [];

  if (blockedPhoneHashes.length) {
    const users = await User.find({
      phoneHash: { $in: blockedPhoneHashes }
    }).select("_id");

    blockedUserIdsByPhone = users.map(u => u._id.toString());
  }

  // ================================
  // STEP 5️⃣: Exclude list (superlike safe)
  // ================================
  const excludeIds = [
    ...swipes.map(s => s.targetId.toString()),
    ...matchedIds,
    ...blocked.map(id => id.toString()),
    ...blockedUserIdsByPhone,
    userId.toString()
  ].filter(id => !superlikeSet.has(id));

  // ================================
  // STEP 6️⃣: HARD DISCOVERY FILTERS
  // ================================
  const query = {
    userId: { $nin: excludeIds },
    isDiscoverable: true
  };

  // Gender
  if (myProfile.preferences?.genderPreference?.length) {
    query.gender = { $in: myProfile.preferences.genderPreference };
  }

  // Age range (DOB)
  if (myProfile.preferences?.ageRange) {
    const now = new Date();
    query.dob = {
      $gte: new Date(now.getFullYear() - myProfile.preferences.ageRange.max, 0, 1),
      $lte: new Date(now.getFullYear() - myProfile.preferences.ageRange.min, 11, 31)
    };
  }

  // Distance
  if (
    myProfile.location?.coordinates &&
    myProfile.preferences?.distanceRange
  ) {
    query.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: myProfile.location.coordinates
        },
        $maxDistance: myProfile.preferences.distanceRange * 1000
      }
    };
  }

  // ================================
  // STEP 7️⃣: DB se profiles lao
  // ================================
  const fetchLimit = Math.min(limit * 3, 100);

  let profiles = await Profile.find(query)
    .limit(fetchLimit)
    .select("userId nickname bio photos location dob gender interests createdAt")
    .lean();

  // ================================
  // STEP 8️⃣: SOFT DISCOVERY (SCORING)
  // ================================
  const feedInterests =
    myProfile.discoveryFilters?.interests?.length > 0
      ? myProfile.discoveryFilters.interests
      : myProfile.interests;

  const interestSet = new Set(feedInterests || []);
  const now = new Date();

  const scoredProfiles = [];

  for (const profile of profiles) {
    const isSuperliked = superlikeSet.has(profile.userId.toString());
    let score = isSuperliked ? 1000 : 0;

    // 🔥 BOOST CHECK (ONLY if NOT superliked)
    if (!isSuperliked && redis) {
      try {
        const boosted = await redis.get(`boost:${profile.userId.toString()}`);
        if (boosted) {
          score += 200; // boost score
        }
      } catch (err) {
        console.error("❌ Boost check error:", err);
      }
    }

    // Interests score
    if (interestSet.size && profile.interests?.length) {
      const common = profile.interests.filter(i => interestSet.has(i)).length;
      score += common * 10;
    }

    // Bio bonus
    if (profile.bio) score += 5;

    // Fresh profile bonus
    const daysOld = (now - new Date(profile.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysOld < 7) score += 5;

    scoredProfiles.push({
      ...profile,
      _matchScore: score,
      superlikedBy: isSuperliked
    });
  }

  // ================================
  // STEP 9️⃣: Sorting
  // ================================
  scoredProfiles.sort((a, b) => {
    if (a.superlikedBy !== b.superlikedBy) return a.superlikedBy ? -1 : 1;
    if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const result = scoredProfiles.slice(0, limit);

  // ================================
  // STEP 🔟: Redis cache save
  // ================================
  if (redis && result.length) {
    try {
      await redis.set(
        CACHE_KEY,
        JSON.stringify({
          data: result,
          cachedAt: Date.now()
        }),
        { EX: CACHE_TTL }
      );
    } catch (err) {
      console.error("❌ Redis SET error:", err);
    }
  }

  return {
    data: result,
    cached: false
  };
}

module.exports = { getFeedService };







// async function getFeedService(userId, limit = 20) {

//   // const CACHE_KEY = `feed:${userId}`;
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const CACHE_TTL = 300; // 5 minutes


//   console.log(CACHE_KEY,"cache key")


//   // ===============================
//   // STEP 1️⃣ : Redis se feed try karo
//   // ================================
//   // if (redis) {
//   //   const cached = await redis.get(CACHE_KEY);
//   //   if (cached) {
//   //     console.log("✅ FEED FROM REDIS");
//   //     const parsed = JSON.parse(cached);
//   //     parsed.cached = true;
//   //     return parsed;
//   //   }
//   // }

// //   if (redis) {
// //   const cached = await redis.get(CACHE_KEY);
// //   if (cached) {
// //     console.log("✅ FEED FROM REDIS");
// //     const parsed = JSON.parse(cached);
// //     return {
// //       data: parsed.data,
// //       cached: true
// //     };
// //   }
// // }

//   if (redis) {
//     const cached = await redis.get(CACHE_KEY);
//     if (cached) {
//       const parsed = JSON.parse(cached);
//       return {
//         data: parsed.data,
//         cached: true
//       };
//     }
//   }


//   console.log("❌ REDIS MISS → DB SE FEED");

//   // ================================
//   // STEP 2️⃣ : Current user ka profile
//   // ================================
//   const myProfile = await Profile.findOne({ userId })
//     .select("preferences location interests discoveryFilters isDiscoverable")
//     .lean();

//   if (!myProfile) throw new Error("Profile not found");


//   // ================================
//   // STEP 3️⃣ : Superlikes nikalo 
//   // ================================

//   const superlikes = await Swipe.find({
//     targetId: userId,
//     action: "superlike"
//   }).select("swiperId").lean();

//   const superlikeSet = new Set(
//     superlikes.map(s => s.swiperId.toString())
//   );

//   // ================================
//   // STEP 4️⃣ : Swipes + Matches + Block
//   // ================================
//   const swipes = await Swipe.find({
//     swiperId: userId,
//     action: { $in: ["like", "pass"] }
//   }).select("targetId").lean();

//   const matches = await Match.find({
//     users: userId
//   }).select("users").lean();

//   const matchedIds = matches
//     .flatMap(m => m.users)
//     .map(id => id.toString())
//     .filter(id => id !== userId.toString());

//   const blocked = await userActionsModel.find({
//     $or: [
//       { actorId: userId, actionType: { $in: ["block", "report"] } },
//       { targetId: userId, actionType: "block" }
//     ]
//   }).distinct("targetId");


//   // 🔹 Step 4.1: phone ke basis par blocked contacts lao
// const blockedPhoneHashes = await BlockedContact.find({
//   userId
// }).distinct("blockedPhoneHash");

// // 🔹 Step 4.2: un phone hashes se users nikaalo
// let blockedUserIdsByPhone = [];

// if (blockedPhoneHashes.length) {
//   const users = await User.find({
//     phoneHash: { $in: blockedPhoneHashes }
//   }).select("_id");

//   blockedUserIdsByPhone = users.map(u => u._id.toString());
// }

//   // ================================
//   // STEP 5️⃣ : Exclude list (superlike safe)
//   // ================================
//   const excludeIds = [
//     ...swipes.map(s => s.targetId.toString()),
//     ...matchedIds,
//     ...blocked.map(id => id.toString()),
//     ...blockedUserIdsByPhone,
//     userId.toString()
//   ].filter(id => !superlikeSet.has(id));

//   // ================================
//   // STEP 6️⃣ : HARD DISCOVERY FILTERS
//   // ================================
//   const query = {
//     userId: { $nin: excludeIds },
//     isDiscoverable: true
//   };


//   // Gender
//   if (myProfile.preferences?.genderPreference?.length) {
//     query.gender = { $in: myProfile.preferences.genderPreference };
//   }

//   // Age range (DOB)
//   if (myProfile.preferences?.ageRange) {
//     const now = new Date();
//     query.dob = {
//       $gte: new Date(now.getFullYear() - myProfile.preferences.ageRange.max, 0, 1),
//       $lte: new Date(now.getFullYear() - myProfile.preferences.ageRange.min, 11, 31)
//     };
//   }

//   // Distance
//   if (
//     myProfile.location?.coordinates &&
//     myProfile.preferences?.distanceRange
//   ) {
//     query.location = {
//       $near: {
//         $geometry: {
//           type: "Point",
//           coordinates: myProfile.location.coordinates
//         },
//         $maxDistance: myProfile.preferences.distanceRange * 1000
//       }
//     };
//   }
//   // query.$or = [
//   //   // Everyone ko visible
//   //   { visibility: "everyone" },

//   //   // Matches-only → sirf matched users
//   //   {
//   //     visibility: "matches_only",
//   //     userId: { $in: matchedIds}
//   //   }
//   // ];

//   // ================================
//   // STEP 7️⃣ : DB se profiles lao
//   // ================================
//   const fetchLimit = Math.min(limit * 3, 100);

//   let profiles = await Profile.find(query)
//     .limit(fetchLimit)
//     .select("userId nickname bio photos location dob gender interests createdAt")
//     .lean();


//   // ================================
//   // STEP 8️⃣ : SOFT DISCOVERY (SCORING)
//   // ================================
//   const feedInterests =
//     myProfile.discoveryFilters?.interests?.length > 0
//       ? myProfile.discoveryFilters.interests
//       : myProfile.interests;

//   const interestSet = new Set(feedInterests || []);
//   const now = new Date();

//   // profiles = profiles.map(profile => {
//   //   const isSuperliked = superlikeSet.has(profile.userId.toString());
//   //   let score = isSuperliked ? 1000 : 0;


//   //   const isBoosted = boostedSet.has(profile.userId.toString());

//   //   if (isBoosted) {
//   //     score += 500; // boost bonus
//   //   }

//   for (const profile of profiles) {
//   const isSuperliked = superlikeSet.has(profile.userId.toString());
//   let score = isSuperliked ? 1000 : 0;

//   // 🔥 BOOST CHECK (ONLY if NOT superliked)
//   if (!isSuperliked && redis) {
//     const boosted = await redis.get(`boost:${profile.userId.toString()}`);
//     if (boosted) {
//       score += 200; // boost score
//     }
//   }



//     // Interests score
//     if (interestSet.size && profile.interests?.length) {
//       const common = profile.interests.filter(i => interestSet.has(i)).length;
//       score += common * 10;
//     }

//     // Bio bonus
//     if (profile.bio) score += 5;

//     // Fresh profile bonus
//     const daysOld = (now - new Date(profile.createdAt)) / (1000 * 60 * 60 * 24);
//     if (daysOld < 7) score += 5;

//     return {
//       ...profile,
//       _matchScore: score,
//       superlikedBy: isSuperliked,
//       // boosted: boosted
//     };
//   };

//   // ================================
//   // STEP 9️⃣ : Sorting
//   // ================================
//   profiles.sort((a, b) => {
//     if (a.superlikedBy !== b.superlikedBy) return a.superlikedBy ? -1 : 1;
//     if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
//     return new Date(b.createdAt) - new Date(a.createdAt);
//   });

//   const result = profiles.slice(0, limit);

//   // ================================
//   // STEP 🔟 : Redis cache save
//   // ================================
//   // if (redis && result.length) {
//   //   await redis.set(
//   //     CACHE_KEY,
//   //     JSON.stringify(result),
//   //     { EX: CACHE_TTL }
//   //   );
//   //   // await redis.set(CACHE_KEY, result, CACHE_TTL);
    
//   // }
//     // await redis.set(CACHE_KEY, result, CACHE_TTL);

//     if (redis) {
//   await redis.set(
//     CACHE_KEY,
//     JSON.stringify({
//       data: result,
//       cachedAt: Date.now()
//     }),
//     { EX: CACHE_TTL }
//   );
// }


//   return result;
// }

function calculateDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateProfileCompleteness(profile) {
  let score = 0;
  const weights = {
    photos: 30,
    bio: 20,
    interests: 20,
    location: 15,
    gender: 10,
    dob: 5
  };

  if (profile.photos?.length > 0) score += weights.photos;
  if (profile.bio?.trim()) score += weights.bio;
  if (profile.interests?.length > 0) score += weights.interests;
  if (profile.location?.coordinates?.length === 2) score += weights.location;
  if (profile.gender) score += weights.gender;
  if (profile.dob) score += weights.dob;

  return score;
}


async function doSwipe(swiperId, targetId, action) {
  if (swiperId.toString() === targetId.toString()) {
    throw new Error("Cannot swipe on your own profile");
  }

  const session = await mongoose.startSession();
  let result = { success: true, match: false, message: "Swipe processed" };

  try {
    await session.withTransaction(async () => {
      // 1. Check for existing block
      const targetProfile = await Profile.findOne({ userId: targetId }).session(session);
      if (!targetProfile) {
        throw new Error('Target profile not found');
      }
      const blockExists = await userActionsModel.exists({
        $or: [
          { actorId: swiperId, targetId, actionType: 'block' },
          { actorId: targetId, targetId: swiperId, actionType: 'block' }
        ]
      }).session(session);

      if (blockExists) {
        throw new Error("Action not allowed. User is blocked.");
      }

      // 2. Check for existing swipe
      const existingSwipe = await Swipe.findOne({
        swiperId,
        targetId
      }).session(session);

      if (existingSwipe) {
        result = { success: true, already: true, message: "Already swiped", match: false };
        return;
      }

      // 3. Create new swipe
      await Swipe.create([{ swiperId, targetId, action, createdAt: new Date() }], { session });

      if (redis) {
        await Promise.all([
          redis.del(`feed:${swiperId}`),
          redis.del(`feed:${targetId}`)
        ]);
      }

      // 4. Check for mutual like
      if (['like', 'superlike'].includes(action)) {
        const mutualSwipe = await Swipe.findOne({
          swiperId: targetId, targetId: swiperId, action: { $in: ['like', 'superlike'] }
        }).session(session);

        if (mutualSwipe) {
          // Create match
          const [match] = await Match.create([{
            users: [swiperId, targetId], status: 'matched', lastActivity: new Date()
          }], { session });

          if (redis) {
            await Promise.all([
              redis.del(`feed:${swiperId}`),
              redis.del(`feed:${targetId}`)
            ]);
          }

          // Update Redis if needed
          // if (redis) {
          //   const queueKey1 = `${SWIPE_QUEUE_PREFIX}${swiperId}`;
          //   const queueKey2 = `${SWIPE_QUEUE_PREFIX}${targetId}`;

          //   await Promise.all([
          //     redis.lRem(queueKey1, 0, targetId.toString()),
          //     redis.lRem(queueKey2, 0, swiperId.toString())
          //   ]);
          // }

          result = { success: true, match: true, matchId: match._id, message: "It's a match!" };
          return;
        }
      }

      result = { success: true, match: false, message: "Swipe recorded" };
    });

    return result;

  } catch (error) {
    console.error('Swipe error:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}
async function undoSwipe(swiperId, targetId) {

  const lastSwipe = await Swipe.findOne({ swiperId, targetId })
    .sort({ createdAt: -1 });

  if (!lastSwipe) throw new Error("No swipe to undo");

  if (lastSwipe.action === "superlike") {
    throw new Error("Superlike undo not allowed");
  }

  const match = await Match.findOne({
    users: { $all: [swiperId, targetId] }
  });
  if (match) throw new Error("Cannot undo after match");

  await Swipe.deleteOne({ _id: lastSwipe._id });

  if (redis) {
    await Promise.all([
      redis.sRem(`swiped:${swiperId}`, targetId.toString()),
      redis.lPush(`queue:${swiperId}`, targetId.toString()),
      redis.del(`feed:${swiperId}`)
    ]);
  }

  return { success: true, message: "Swipe undone" };
}


// async function undoSwipe(swiperId, targetId) {
//   // const res = await Swipe.findOneAndDelete({ swiperId, targetId });
//   const res = await Swipe.findOneAndDelete({
//   swiperId,
//   targetId
// }).sort({ createdAt: -1 });

//   if (!res) throw new Error("Swipe not found or cannot undo");

//   if (res.action === "superlike") {
//   throw new Error("Superlike undo not allowed");
// }

// const match = await Match.findOne({
//   users: { $all: [swiperId, targetId] }
// });
// if (match) throw new Error("Cannot undo after match");


//   if (redis) {
//     await redis.sRem(SWIPED_SET_PREFIX + swiperId, targetId.toString()).catch(() => { });
//     // push back into queue head for user (optional)
//     await redis.lPush(SWIPE_QUEUE_PREFIX + swiperId, targetId.toString()).catch(() => { });
//   }
//    if (redis) {
//   await Promise.all([
//     redis.del(`feed:${swiperId}`),
//     redis.del(`feed:${targetId}`)
//   ]);
// }

//   return { success: true, message: "Swipe undone" };
// }

function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}



// const redisClient = require("../../../config/cache");
// const Discovery = require("../../discovery/discovery.model");

// const FEED_TTL = 300;

// async function getFeedService(userId, limit=2){
//   const redisKey = `feed:${userId}`;

//   // =========================
//   // 1️⃣ Redis check
//   // =========================
//   const cached = await redisClient.get(redisKey);
//   if (cached) {
//     return { source: "redis", data: JSON.parse(cached) };
//   }

//   // =========================
//   // 2️⃣ Discovery preference
//   // =========================
//   const pref = await Discovery.findOne({ userId }).lean();

//   const ageFilter = pref?.ageRange || { min: 18, max: 60 };
//   const genderFilter = pref?.genderPreference || [];
//   const interestFilter = pref?.interests || [];

//   // =========================
//   // 3️⃣ Already swiped users
//   // =========================
//   const swiped = await Swipe.find(
//     { userId },
//     { targetUserId: 1, _id: 0 }
//   ).lean();

//   const excludeIds = swiped.map(s => s.targetUserId);
//   excludeIds.push(userId);

//   // =========================
//   // 4️⃣ MongoDB query build
//   // =========================
//   const query = {
//     userId: { $nin: excludeIds },
//     age: { $gte: ageFilter.min, $lte: ageFilter.max }
//   };

//   if (genderFilter.length) {
//     query.gender = { $in: genderFilter };
//   }

//   if (interestFilter.length) {
//     query.interests = { $in: interestFilter };
//   }

//   const profiles = await Profile.find(query)
//     .limit(limit)
//     .lean();

//   // =========================
//   // 5️⃣ Redis store
//   // =========================
//   await redisClient.set(
//     redisKey,
//     JSON.stringify(profiles),
//     { EX: FEED_TTL }
//   );

//   return { source: "db", data: profiles };
// };


module.exports = {
  getFeedService,
  // getFeedService,
  doSwipe,
  undoSwipe,
  // getDiscoverableProfiles,
  prefetchCandidates, // export for worker or cron prefetcher
  // constants exported for tests or admin
  SWIPE_QUEUE_PREFIX, SWIPED_SET_PREFIX
}
