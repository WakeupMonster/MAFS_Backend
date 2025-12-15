/* eslint-disable no-unused-vars */
/* eslint-disable no-dupe-keys */
// Core swipe logic & Redis integration
const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const Swipe = require("./swipe.model"); // may export Swipe and Match - adjust import
const { Match } = require("./swipe.model");
const mongoose = require("mongoose");
const userActionsModel = require("./BlockReport/userActions.model");

let redis;
try {
  redis = require("../../config/cache").redis || require("../../config/redis").redis;
} catch (e) {
  redis = null;
}

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

// async function getFeed(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId}`;
//   const CACHE_TTL = 300; // 5 minutes

//   try {
//     // 1. Try to get from Redis cache first
//     if (redis && redis.get) {
//       try {
//         const cachedFeed = await redis.get(CACHE_KEY);
//         if (cachedFeed) {
//           console.log('Serving feed from Redis cache for user:', userId);
//           return JSON.parse(cachedFeed);
//         }
//       } catch (redisErr) {
//         console.error('Redis cache get error:', redisErr);
//       }
//     }

//     console.log(`Fetching feed for user: ${userId} from DB`);
    
//     // 2. Get current user's profile
//     const myProfile = await Profile.findOne({ userId }).lean();
//     if (!myProfile) {
//       console.log('User profile not found');
//       return [];
//     }

//     // 3. Get all users who have superliked the current user
//     const superlikes = await Swipe.find({
//       targetId: userId,
//       action: 'superlike'
//     }).select('swiperId').lean();

//     // 4. Get list of users I've already interacted with (except superlikes)
//     const myInteractions = await Swipe.find({
//       swiperId: userId,
//       action: { $ne: 'superlike' } // We'll handle superlikes separately
//     }).select('targetId').lean();

//     // 5. Build the query for fresh profiles (excluding superlikes)
//     const query = { 
//       userId: { 
//         $ne: new mongoose.Types.ObjectId(userId),
//         $nin: myInteractions.map(swipe => swipe.targetId) // Exclude users I've interacted with
//       },
//       isDiscoverable: true,
//       isProfileCompleted: true
//     };

//     // 6. Add gender preference if set
//     if (myProfile.preferences?.genderPreference?.length > 0) {
//       query.gender = { $in: myProfile.preferences.genderPreference };
//     }

//     // 7. Add age range filter
//     const ageMin = myProfile.preferences?.ageRange?.min || 18;
//     const ageMax = myProfile.preferences?.ageRange?.max || 60;
//     const now = new Date();
//     query.dob = {
//       $lte: new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate()),
//       $gte: new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate())
//     };

//     // 8. Add location filter
//     if (myProfile.location?.coordinates?.length === 2) {
//       query["location.coordinates"] = {
//         $near: {
//           $geometry: {
//             type: "Point",
//             coordinates: myProfile.location.coordinates
//           },
//           $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//         }
//       };
//       console.log('Location filter applied with coordinates:', myProfile.location.coordinates);
//     }

//     // 9. Exclude blocked users
//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).distinct('targetId');
    
//     if (blockedUsers.length > 0) {
//       query.userId.$nin = [...(query.userId.$nin || []), ...blockedUsers.map(id => new mongoose.Types.ObjectId(id))];
//     }

//     // 10. Execute the query to get fresh profiles
//     let profiles = await Profile.find(query)
//       .limit(limit)
//       .select('userId fullName nickname bio photos location dob gender interests')
//       .sort({ createdAt: -1 })
//       .lean();

//     // 11. Create a map of users who superliked me
//     const superlikeMap = {};
//     superlikes.forEach(swipe => {
//       superlikeMap[swipe.swiperId.toString()] = true;
//     });

//     // 12. Add superlike information to profiles
//     profiles = profiles.map(profile => ({
//       ...profile,
//       superlikedBy: superlikeMap[profile.userId.toString()] || false
//     }));

//     // 13. Now add profiles of users who superliked me but might have been excluded
//     const superlikersNotInFeed = await Profile.find({
//       userId: {
//         $in: superlikes
//           .map(sl => sl.swiperId)
//           .filter(id => {
//             // Only include superlikers who aren't already in the feed
//             return !profiles.some(p => p.userId.toString() === id.toString());
//           }),
//         // Make sure we don't include blocked users
//         $nin: blockedUsers
//       }
//     })
//     .select('userId fullName nickname bio photos location dob gender interests')
//     .lean();

//     // 14. Add superlikers to the feed
//     const superlikersWithFlag = superlikersNotInFeed.map(profile => ({
//       ...profile,
//       superlikedBy: true
//     }));

//     // 15. Combine both arrays (fresh profiles + superlikers) and limit to the requested limit
//     const combinedProfiles = [...profiles, ...superlikersWithFlag];
//     const finalProfiles = combinedProfiles.slice(0, limit);

//     // 16. Cache the results in Redis
//     if (redis && redis.set && finalProfiles.length > 0) {
//       try {
//         await redis.set(
//           CACHE_KEY,
//           JSON.stringify(finalProfiles),
//           { EX: CACHE_TTL }
//         );
//         console.log('Feed cached in Redis for user:', userId);
//       } catch (cacheErr) {
//         console.error('Error caching feed in Redis:', cacheErr);
//       }
//     }

//     return finalProfiles;

//   } catch (error) {
//     console.error('Error in getFeed:', error);
//     throw error;
//   }
// }



// async function getFeed(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId}`;
//   const CACHE_TTL = 300; // 5 minutes

//   try {
//     // 1. Try to get from Redis cache first
//     if (redis && redis.get) {
//       try {
//         const cachedFeed = await redis.get(CACHE_KEY);
//         if (cachedFeed) {
//           console.log('Serving feed from Redis cache for user:', userId);
//           return JSON.parse(cachedFeed);
//         }
//       } catch (redisErr) {
//         console.error('Redis cache get error:', redisErr);
//       }
//     }

//     console.log(`Fetching feed for user: ${userId} from DB`);
    
//     // 2. Get current user's profile
//     const myProfile = await Profile.findOne({ userId }).lean();
//     if (!myProfile) {
//       console.log('User profile not found');
//       return [];
//     }

//     // 3. Get all users who have superliked the current user
//     const superlikes = await Swipe.find({
//       targetId: userId,
//       action: 'superlike'
//     }).select('swiperId').lean();

//     // 4. Get list of users I've already interacted with
//     const myInteractions = await Swipe.find({
//       swiperId: userId
//     }).select('targetId action').lean();

//     // 5. Build the query
//     const query = { 
//       userId: { 
//         $ne: new mongoose.Types.ObjectId(userId),
//         // Exclude users I've interacted with, except those who superliked me
//         $nin: myInteractions
//           .filter(swipe => !superlikes.some(sl => sl.swiperId.equals(swipe.targetId)))
//           .map(swipe => swipe.targetId)
//       }
//     };

//     // 6. Add gender preference if set
//     if (myProfile.preferences?.genderPreference?.length > 0) {
//       query.gender = { $in: myProfile.preferences.genderPreference };
//     }

//     // 7. Add age range filter
//     const ageMin = myProfile.preferences?.ageRange?.min || 18;
//     const ageMax = myProfile.preferences?.ageRange?.max || 60;
//     const now = new Date();
//     query.dob = {
//       $lte: new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate()),
//       $gte: new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate())
//     };

//     // 8. Add location filter
//     if (myProfile.location?.coordinates?.length === 2) {
//       query["location.coordinates"] = {
//         $near: {
//           $geometry: {
//             type: "Point",
//             coordinates: myProfile.location.coordinates
//           },
//           $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//         }
//       };
//       console.log('Location filter applied with coordinates:', myProfile.location.coordinates);
//     }

//     // 9. Exclude blocked users
//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).distinct('targetId');
    
//     if (blockedUsers.length > 0) {
//       query.userId.$nin = [...(query.userId.$nin || []), ...blockedUsers.map(id => new mongoose.Types.ObjectId(id))];
//     }

//     // 10. Execute the query to get fresh profiles
//     let profiles = await Profile.find(query)
//       .limit(limit)
//       .select('userId fullName nickname bio photos location dob gender interests')
//       .sort({ createdAt: -1 })
//       .lean();

//     // 11. Add superlike information to profiles
//     const superlikeMap = {};
//     superlikes.forEach(swipe => {
//       superlikeMap[swipe.swiperId.toString()] = true;
//     });

//     // 12. Add superlike flag to profiles
//     profiles = profiles.map(profile => ({
//       ...profile,
//       superlikedBy: superlikeMap[profile.userId.toString()] || false
//     }));

//     // 13. Add superlikers who might have been excluded
//     const superlikersNotInFeed = await Profile.find({
//       userId: {
//         $in: superlikes
//           .map(sl => sl.swiperId)
//           .filter(id => !profiles.some(p => p.userId.toString() === id.toString())),
//         $nin: blockedUsers
//       }
//     })
//     .select('userId fullName nickname bio photos location dob gender interests')
//     .lean();

//     // 14. Add superlikers to the feed
//     const superlikersWithFlag = superlikersNotInFeed.map(profile => ({
//       ...profile,
//       superliked: true
//     }));

//     // 15. Combine both arrays and limit to the requested limit
//     const allProfiles = [...profiles, ...superlikersWithFlag].slice(0, limit);

//     // 16. Cache the results in Redis
//     if (redis && redis.set && allProfiles.length > 0) {
//       try {
//         await redis.set(
//           CACHE_KEY,
//           JSON.stringify(allProfiles),
//           { EX: CACHE_TTL }
//         );
//         console.log('Feed cached in Redis for user:', userId);
//       } catch (cacheErr) {
//         console.error('Error caching feed in Redis:', cacheErr);
//       }
//     }

//     return allProfiles;

//   } catch (error) {
//     console.error('Error in getFeed:', error);
//     throw error;
//   }
// }



// async function getFeed(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId}`;
//   const CACHE_TTL = 300; // 5 minutes

//   try {
//     // 1. Try to get from Redis cache first
//     if (redis && redis.get) {
//       try {
//         const cachedFeed = await redis.get(CACHE_KEY);
//         if (cachedFeed) {
//           console.log('Serving feed from Redis cache for user:', userId);
//           return JSON.parse(cachedFeed);
//         }
//       } catch (redisErr) {
//         console.error('Redis cache get error:', redisErr);
//       }
//     }

//     console.log(`Fetching feed for user: ${userId} from DB`);

//     // 2. Get current user's profile with preferences
//     const myProfile = await Profile.findOne({ userId })
//       .select('preferences location interests')
//       .lean();
    
//     if (!myProfile) {
//       throw new Error('User profile not found');
//     }

//     // 3. Get all users who have superliked the current user
//     const superlikes = await Swipe.find({
//       targetId: userId,
//       action: 'superlike'
//     }).select('swiperId').lean();

//     // 4. Get list of users I've already interacted with
//     const myInteractions = await Swipe.find({
//       swiperId: userId
//     }).select('targetId').lean();

//     // 5. Get blocked users
//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).distinct('targetId');

//     // 6. Build base query (only essential filters)
//     const query = {
//       userId: { 
//         $ne: new mongoose.Types.ObjectId(userId),
//         $nin: [
//           ...myInteractions.map(i => i.targetId),
//           ...blockedUsers
//         ]
//       },
//       isDiscoverable: true
//     };

//     // 7. Fetch more profiles than needed to have enough after filtering
//     const fetchLimit = Math.min(limit * 3, 100); // Fetch up to 100 profiles
//     let profiles = await Profile.find(query)
//       .limit(fetchLimit)
//       .select('userId fullName nickname bio photos location dob gender interests createdAt')
//       .lean();

//     // 8. Calculate scores for each profile
//     const now = new Date();
//     const myLocation = myProfile.location?.coordinates;
//     const myPreferences = myProfile.preferences || {};
//     const myInterests = new Set(myProfile.interests || []);

//     profiles = profiles.map(profile => {
//       let score = 0;
//       const profileInterests = new Set(profile.interests || []);
      
//       // Age score (0-30 points)
//       if (profile.dob) {
//         const age = now.getFullYear() - new Date(profile.dob).getFullYear();
//         if (myPreferences.ageRange) {
//           const { min = 18, max = 60 } = myPreferences.ageRange;
//           if (age >= min && age <= max) {
//             score += 30; // Full points for being in range
//           } else {
//             // Gradual decrease outside range
//             const distance = Math.max(0, Math.max(min - age, age - max) - 1);
//             score += Math.max(0, 30 - (distance * 2));
//           }
//         }
//       }

//       // Gender score (0 or 30 points)
//       if (myPreferences.genderPreference?.length) {
//         if (myPreferences.genderPreference.includes(profile.gender)) {
//           score += 30;
//         }
//       } else {
//         // If no preference, give some points by default
//         score += 15;
//       }

//       // Location score (0-30 points)
//       if (myLocation && profile.location?.coordinates) {
//         const distance = calculateDistance(
//           myLocation,
//           profile.location.coordinates
//         );
//         const maxDistance = myPreferences.distanceRange || 50;
//         if (distance <= maxDistance) {
//           // Closer = higher score
//           const distanceScore = 30 * (1 - (distance / maxDistance));
//           score += Math.max(0, distanceScore);
//         }
//       }

//       // Common interests score (0-20 points)
//       if (myInterests.size > 0 && profileInterests.size > 0) {
//         const common = [...myInterests].filter(x => profileInterests.has(x)).length;
//         const interestScore = Math.min(20, (common / myInterests.size) * 20);
//         score += interestScore;
//       }

//       // Profile completeness bonus (0-10 points)
//       const completeness = calculateProfileCompleteness(profile);
//       score += completeness * 0.1; // Up to 10 points

//       return {
//         ...profile,
//         _matchScore: Math.round(score * 10) / 10, // Keep one decimal place
//         distance: myLocation && profile.location?.coordinates 
//           ? calculateDistance(myLocation, profile.location.coordinates)
//           : null
//       };
//     });

//     // 9. Sort by score (highest first), then by superlike status, then by recency
//     profiles.sort((a, b) => {
//       // First by score (descending)
//       if (b._matchScore !== a._matchScore) {
//         return b._matchScore - a._matchScore;
//       }
      
//       // Then by superlike status (superliked first)
//       const aSuperliked = superlikes.some(s => s.swiperId.equals(a.userId));
//       const bSuperliked = superlikes.some(s => s.swiperId.equals(b.userId));
//       if (aSuperliked !== bSuperliked) {
//         return aSuperliked ? -1 : 1;
//       }
      
//       // Then by recency (newer first)
//       return new Date(b.createdAt) - new Date(a.createdAt);
//     });

//     // 10. Take only the requested number of profiles
//     const result = profiles.slice(0, limit);

//     // 11. Add superlike information
//     const superlikeMap = new Map(superlikes.map(s => [s.swiperId.toString(), true]));
//     const finalProfiles = result.map(profile => ({
//       ...profile,
//       superlikedBy: superlikeMap.has(profile.userId.toString())
//     }));

//     // 12. Cache the results in Redis
//     if (redis?.set && finalProfiles.length > 0) {
//       try {
//         await redis.set(
//           CACHE_KEY,
//           JSON.stringify(finalProfiles),
//           { EX: CACHE_TTL }
//         );
//         console.log('Feed cached in Redis for user:', userId);
//       } catch (cacheErr) {
//         console.error('Error caching feed in Redis:', cacheErr);
//       }
//     }

//     return finalProfiles;

//   } catch (error) {
//     console.error('Error in getFeed:', error);
//     throw error;
//   }
// }


// // Helper function to calculate distance between two points (in km)
// function calculateDistance(coord1, coord2) {
//   const [lon1, lat1] = coord1;
//   const [lon2, lat2] = coord2;
  
//   const R = 6371; // Earth's radius in km
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a = 
//     Math.sin(dLat/2) * Math.sin(dLat/2) +
//     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
//     Math.sin(dLon/2) * Math.sin(dLon/2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//   return R * c;
// }

// // Helper function to calculate profile completeness (0-100)
// function calculateProfileCompleteness(profile) {
//   let score = 0;
//   const weights = {
//     photos: 30,
//     bio: 20,
//     interests: 20,
//     location: 15,
//     gender: 10,
//     dob: 5
//   };

//   if (profile.photos?.length > 0) score += weights.photos;
//   if (profile.bio?.trim()) score += weights.bio;
//   if (profile.interests?.length > 0) score += weights.interests;
//   if (profile.location?.coordinates?.length === 2) score += weights.location;
//   if (profile.gender) score += weights.gender;
//   if (profile.dob) score += weights.dob;

//   return score;
// }





async function getFeed(userId, limit = 20) {
  const CACHE_KEY = `feed:${userId}`;
  const CACHE_TTL = 300; // 5 minutes

  try {
    // 1. Try to get from Redis cache first
    if (redis && redis.get) {
      try {
        const cachedFeed = await redis.get(CACHE_KEY);
        if (cachedFeed) {
          console.log('Serving feed from Redis cache for user:', userId);
          return JSON.parse(cachedFeed);
        }
      } catch (redisErr) {
        console.error('Redis cache get error:', redisErr);
      }
    }

    console.log(`Fetching feed for user: ${userId} from DB`);

    // 2. Get current user's profile with preferences
    const myProfile = await Profile.findOne({ userId })
      .select('preferences location interests')
      .lean();
    
    if (!myProfile) {
      throw new Error('User profile not found');
    }

    // 3. Get all users who have superliked the current user
    const superlikes = await Swipe.find({
      targetId: userId,
      action: 'superlike'
    }).select('swiperId').lean();

    // 4. Get list of users I've already liked/passed
    const mySwipes = await Swipe.find({
      swiperId: userId,
      action: { $in: ['like', 'pass'] }
    }).select('targetId action').lean();

    // 5. Get matched users (mutual likes)
    const myMatches = await Match.find({
      users: { $in: [userId] }
    }).select('users').lean();
    const matchedUserIds = myMatches.flatMap(match => 
      match.users.map(id => id.toString())
    ).filter(id => id !== userId.toString());

    // 6. Get blocked/reported users
    const blockedOrReported = await userActionsModel.find({
      $or: [
        { actorId: userId, actionType: { $in: ['block', 'report'] } },
        { targetId: userId, actionType: { $in: ['block'] } }
      ]
    }).distinct('targetId');

    // 7. Combine all users to exclude
    const usersToExclude = [
      ...mySwipes.map(s => s.targetId.toString()),
      ...matchedUserIds,
      ...blockedOrReported.map(id => id.toString()),
      userId.toString() // Exclude self
    ];

    // 8. Get superliked user IDs (these will override the exclusion)
    const superlikeUserIds = superlikes.map(s => s.swiperId.toString());
    
    // 9. Build base query
    const query = {
      userId: { 
        $nin: usersToExclude.filter(id => !superlikeUserIds.includes(id))
      }
    };

    // 10. Fetch more profiles than needed to have enough after filtering
    const fetchLimit = Math.min(limit * 3, 100);
    let profiles = await Profile.find(query)
      .limit(fetchLimit)
      .select('userId fullName nickname bio photos location dob gender interests createdAt')
      .lean();

    // 11. Add superlike information
    const superlikeMap = new Map(superlikes.map(s => [s.swiperId.toString(), true]));
    
    // 12. Calculate scores for each profile
    const now = new Date();
    const myLocation = myProfile.location?.coordinates;
    const myPreferences = myProfile.preferences || {};
    // const myInterests = new Set(myProfile.interests || []);
    const myInterests = new Set(
  myProfile.discoveryFilters?.interests || []
);


    profiles = profiles.map(profile => {
      const isSuperliked = superlikeMap.has(profile.userId.toString());
      let score = isSuperliked ? 100 : 0; // Start with 100 if superliked
      const profileInterests = new Set(profile.interests || []);
      
      // Only calculate other scores if not superliked

      if (!isSuperliked) {
        // Age score (0-30 points)
        if (profile.dob) {
          const age = now.getFullYear() - new Date(profile.dob).getFullYear();
          if (myPreferences.ageRange) {
            const { min = 18, max = 60 } = myPreferences.ageRange;
            if (age >= min && age <= max) {
              score += 30;
            } else {
              const distance = Math.max(0, Math.max(min - age, age - max) - 1);
              score += Math.max(0, 30 - (distance * 2));
            }
          }
        }

        // Gender score (0 or 30 points)
        if (myPreferences.genderPreference?.length) {
          if (myPreferences.genderPreference.includes(profile.gender)) {
            score += 30;
          }
        } else {
          score += 15;
        }

        // Location score (0-30 points)
        if (myLocation && profile.location?.coordinates) {
          const distance = calculateDistance(
            myLocation,
            profile.location.coordinates
          );
          const maxDistance = myPreferences.distanceRange || 50;
          if (distance <= maxDistance) {
            const distanceScore = 30 * (1 - (distance / maxDistance));
            score += Math.max(0, distanceScore);
          }
        }

        // Common interests score (0-20 points)
        if (myInterests.size > 0 && profileInterests.size > 0) {
          const common = [...myInterests].filter(x => profileInterests.has(x)).length;
          const interestScore = Math.min(20, (common / myInterests.size) * 20);
          score += interestScore;
        }

        // Profile completeness bonus (0-10 points)
        const completeness = calculateProfileCompleteness(profile);
        score += completeness * 0.1;
      }

      return {
        ...profile,
        _matchScore: Math.round(score * 10) / 10,
        // distance: myLocation && profile.location?.coordinates 
        //   ? calculateDistance(myLocation, profile.location.coordinates)
        //   : null,
        superlikedBy: isSuperliked
      };
    });

    // 13. Sort by score (highest first), then by superlike status, then by recency
    profiles.sort((a, b) => {
      // First by score (descending)
      if (b._matchScore !== a._matchScore) {
        return b._matchScore - a._matchScore;
      }
      
      // Then by superlike status (superliked first)
      if (a.superlikedBy !== b.superlikedBy) {
        return a.superlikedBy ? -1 : 1;
      }
      
      // Then by recency (newer first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // 14. Take only the requested number of profiles
    const result = profiles.slice(0, limit);

    // 15. Cache the results in Redis
    if (redis?.set && result.length > 0) {
      try {
        await redis.set(
          CACHE_KEY,
          JSON.stringify(result),
          { EX: CACHE_TTL }
        );
        console.log('Feed cached in Redis for user:', userId);
      } catch (cacheErr) {
        console.error('Error caching feed in Redis:', cacheErr);
      }
    }

    return result;

  } catch (error) {
    console.error('Error in getFeed:', error);
    throw error;
  }
}

// Keep the same helper functions as before
function calculateDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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



// async function getFeed(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId}`;
//   const CACHE_TTL = 300; // 5 minutes

//   try {
//     // 1. Try to get from Redis cache first
//     if (redis && redis.get) {
//       try {
//         const cachedFeed = await redis.get(CACHE_KEY);
//         if (cachedFeed) {
//           console.log('Serving feed from Redis cache for user:', userId);
//           return JSON.parse(cachedFeed);
//         }
//       } catch (redisErr) {
//         console.error('Redis cache get error:', redisErr);
//         // Continue to fetch from DB if Redis fails
//       }
//     }

//     console.log(`Fetching feed for user: ${userId} from DB`);
    
//     // 2. Get current user's profile
//     const myProfile = await Profile.findOne({ userId }).lean();
//     if (!myProfile) {
//       console.log('User profile not found');
//       return [];
//     }

//     // 3. Build the query
//     const query = { 
//       userId: { $ne: new mongoose.Types.ObjectId(userId) }
//     };

//     // 4. Add gender preference if set
//     if (myProfile.preferences?.genderPreference?.length > 0) {
//       query.gender = { $in: myProfile.preferences.genderPreference };
//     }

//     // 5. Add age range filter
//     const ageMin = myProfile.preferences?.ageRange?.min || 18;
//     const ageMax = myProfile.preferences?.ageRange?.max || 60;
//     const now = new Date();
//     query.dob = {
//       $lte: new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate()),
//       $gte: new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate())
//     };

//     // 6. Add location filter
//     if (myProfile.location?.coordinates?.length === 2) {
//       query["location.coordinates"] = {
//         $near: {
//           $geometry: {
//             type: "Point",
//             coordinates: myProfile.location.coordinates
//           },
//           $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//         }
//       };
//       console.log('Location filter applied with coordinates:', myProfile.location.coordinates);
//     }

//     // 7. Exclude swiped users
//     const swipedUsers = await Swipe.find({ swiperId: userId }).distinct('targetId');
//     if (swipedUsers.length > 0) {
//       query.userId.$nin = swipedUsers.map(id => new mongoose.Types.ObjectId(id));
//     }

//     // 8. Exclude blocked users
//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).distinct('targetId');
    
//     if (blockedUsers.length > 0) {
//       query.userId.$nin = [...(query.userId.$nin || []), ...blockedUsers.map(id => new mongoose.Types.ObjectId(id))];
//     }
//     const superlikes = await Swipe.find({
//   targetId: userId,  // Who received the superlike
//   action: 'superlike'
// }).select('swiperId').lean();
// // Create a map of userId -> true for users who superliked current user
// const usersWhoSuperlikedMe = {};
// superlikes.forEach(swipe => {
//   usersWhoSuperlikedMe[swipe.swiperId.toString()] = true;
// });
    

//     // 9. Execute the query
//     const profileResults = await Profile.find(query)
//       .limit(limit)
//       .select('userId fullName nickname bio photos location dob gender interests')
//       .sort({ createdAt: -1 })
//       .lean();
// const profiles = profileResults.map(profile => {
//   // Check if this profile's user has superliked the current user
//   const hasSuperlikedMe = usersWhoSuperlikedMe[profile.userId.toString()] || false;
  
//   return {
//     ...profile,
//     superlikedBy: hasSuperlikedMe
//   };
// });
//     // 10. Cache the results in Redis
//     if (redis && redis.set && profileResults.length > 0) {
//       try {
//         await redis.set(
//           CACHE_KEY,
//           JSON.stringify(profiles),
//           { EX: CACHE_TTL }
//         );
//         console.log('Feed cached in Redis for user:', userId);
//       } catch (cacheErr) {
//         console.error('Error caching feed in Redis:', cacheErr);
//       }
//     }

//     return profileResults;

//   } catch (error) {
//     console.error('Error in getFeed:', error);
//     throw error;
//   }
// }



// async function getFeed(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId}`;
//   const CACHE_TTL = 300; // 5 minutes
//   try {
//     // 1. Try to get from Redis cache first
//     if (redis) {
//       const cachedFeed = await redis.get(CACHE_KEY);
//       if (cachedFeed) {
//         console.log('Serving feed from Redis cache');
//         return JSON.parse(cachedFeed);
//       }
//     }

//     console.log(`Fetching feed for user: ${userId} from DB`);
    
//     // 2. Get current user's profile
//     const myProfile = await Profile.findOne({ userId }).lean();
//     if (!myProfile) {
//       console.log('User profile not found');
//       return [];
//     }

//     // 3. Build basic query
//     const query = { 
//       userId: { $ne: new mongoose.Types.ObjectId(userId) }
//     };

//     // 4. Add gender preference if set
//     if (myProfile.preferences?.genderPreference?.length > 0) {
//       query.gender = { $in: myProfile.preferences.genderPreference };
//     }

//     // 5. Add age range filter
//     const ageMin = myProfile.preferences?.ageRange?.min || 18;
//     const ageMax = myProfile.preferences?.ageRange?.max || 60;
//     const now = new Date();
//     query.dob = {
//       $lte: new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate()),
//       $gte: new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate())
//     };

//     // 6. Add location filter
//     if (myProfile.location?.coordinates?.length === 2) {
//       query["location.coordinates"] = {
//         $near: {
//           $geometry: {
//             type: "Point",
//             coordinates: myProfile.location.coordinates
//           },
//           $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//         }
//       };
//       console.log('Location filter applied with coordinates:', myProfile.location.coordinates);
//     }

//     // 7. Exclude swiped users
//     const swipedUsers = await Swipe.find({ swiperId: userId }).distinct('targetId');
//     if (swipedUsers.length > 0) {
//       query.userId.$nin = swipedUsers.map(id => new mongoose.Types.ObjectId(id));
//     }

//     // 8. Exclude blocked users
//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).distinct('targetId');
    
//     if (blockedUsers.length > 0) {
//       query.userId.$nin = [...(query.userId.$nin || []), ...blockedUsers.map(id => new mongoose.Types.ObjectId(id))];
//     }

//     // 9. Execute the query
//     const profiles = await Profile.find(query)
//       .limit(limit)
//       .select('userId fullName nickname bio photos location dob gender interests')
//       .sort({ createdAt: -1 })
//       .lean();

//     // 10. Cache the results in Redis
//     if (redis && profiles.length > 0) {
//       await redis.set(
//         CACHE_KEY,
//         JSON.stringify(profiles),
//         'EX', // Set expiry
//         CACHE_TTL
//       );
//       console.log('Feed cached in Redis for user:', userId);
//     }

//     return profiles;

//   } catch (error) {
//     console.error('Error in getFeed:', error);
//     throw error;
//   }
// }

// async function getFeed(userId, limit = 20) {
//    const CACHE_KEY = `feed:${userId}`;
//   const CACHE_TTL = 300;
//   try {
//      if (redis) {
//       const cachedFeed = await redis.get(CACHE_KEY);
//       if (cachedFeed) {
//         console.log('Serving feed from Redis cache');
//         return JSON.parse(cachedFeed);
//       }
//     }

//     console.log(`Fetching feed for user: ${userId}`);
    
//     // 1. Get current user's profile
//     const myProfile = await Profile.findOne({ userId }).lean();
//     if (!myProfile) {
//       console.log('User profile not found');
//       return [];
//     }

//     // 2. Build basic query
//     const query = { 
//       userId: { $ne: new mongoose.Types.ObjectId(userId) 
//       },
//       //  isDiscoverable: true,
//       // isProfileComplete: true,
//     };

//     // 3. Add gender preference if set
//     if (myProfile.preferences?.genderPreference?.length > 0) {
//       query.gender = { $in: myProfile.preferences.genderPreference };
//     }

//     // 4. Add age range filter
//     const ageMin = myProfile.preferences?.ageRange?.min || 18;
//     const ageMax = myProfile.preferences?.ageRange?.max || 60;
//     const now = new Date();
//     query.dob = {
//       $lte: new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate()),
//       $gte: new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate())
//     };


// if (myProfile.location?.coordinates?.length === 2) {
//   query["location.coordinates"] = {
//     $near: {
//       $geometry: {
//         type: "Point",
//         coordinates: myProfile.location.coordinates
//       },
//       $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//     }
//   };
//   console.log('Location filter applied with coordinates:', myProfile.location.coordinates);
// }

//     const swipedUsers = await Swipe.find({ swiperId: userId }).distinct('targetId');
//     if (swipedUsers.length > 0) {
//       query.userId.$nin = swipedUsers.map(id => new mongoose.Types.ObjectId(id));
//     }

//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).distinct('targetId');
    
//     if (blockedUsers.length > 0) {
//       query.userId.$nin = [...(query.userId.$nin || []), ...blockedUsers.map(id => new mongoose.Types.ObjectId(id))];
//     }

    
//     // 9. Execute the query with a simpler approach first
//     // First, try without location filter
//     const testQuery = { ...query };
//     delete testQuery.location;
    
//     const testResults = await Profile.find(testQuery)
//       .limit(limit)
//       .select('userId fullName gender location.coordinates')
//       .lean();
//     testResults.forEach(p => console.log(p.userId, p.gender, p.location?.coordinates));
//     const profiles = await Profile.find(query)
//       .limit(limit)
//       .select('userId fullName nickname bio photos location dob gender interests')
//       .sort({ createdAt: -1 })
//       .lean();
//     return profiles;

//   } catch (error) {
//     console.error('Error in getFeed:', error);
//     throw error;
//   }
// }

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
        result = { success: true, already: true, message: "Already swiped",match: false };
        return;
      }

      // 3. Create new swipe
      await Swipe.create([{ swiperId, targetId, action, createdAt: new Date() }], { session });

      // 4. Check for mutual like
      if (['like', 'superlike'].includes(action)) {
        const mutualSwipe = await Swipe.findOne({ swiperId: targetId, targetId: swiperId, action: { $in: ['like', 'superlike'] }
        }).session(session);

        if (mutualSwipe) {
          // Create match
          const [match] = await Match.create([{ users: [swiperId, targetId], status: 'matched', lastActivity: new Date()
          }], { session });

          // Update Redis if needed
          if (redis) {
            const queueKey1 = `${SWIPE_QUEUE_PREFIX}${swiperId}`;
            const queueKey2 = `${SWIPE_QUEUE_PREFIX}${targetId}`;
            
            await Promise.all([
              redis.lRem(queueKey1, 0, targetId.toString()),
              redis.lRem(queueKey2, 0, swiperId.toString())
            ]);
          }

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
  const res = await Swipe.findOneAndDelete({ swiperId, targetId });
  if (!res) throw new Error("Swipe not found or cannot undo");

  if (redis) {
    await redis.sRem(SWIPED_SET_PREFIX + swiperId, targetId.toString()).catch(()=>{});
    // push back into queue head for user (optional)
    await redis.lPush(SWIPE_QUEUE_PREFIX + swiperId, targetId.toString()).catch(()=>{});
  }
  return { undone: true };
}

// swipe.service.js में नया function add करें
// async function getDiscoverableProfiles(userId, filters = {}) {
//   try {
//     // 1. Current user ka profile fetch karein
//     const currentUserProfile = await Profile.findOne({ userId }).lean();
//     if (!currentUserProfile) {
//       throw new Error("User profile not found");
//     }

//     // 2. Base query - current user ko exclude karein
//     let query = {
//       userId: { $ne: userId },
//       // isDiscoverable: true,
//       visibility: { $ne: "nobody" }  // nobody wale profiles ko filter out karein
//     };

//     // 3. Agar user ne "matches_only" set kiya hai
//     if (currentUserProfile.visibility === "matches_only") {
//       // User ke matches find karein
//       const matches = await Match.find({
//         $or: [
//           { user1: userId, status: "matched" },
//           { user2: userId, status: "matched" }
//         ]
//       }).lean();

//       // Matched users ke IDs nikal lein
//       const matchedUserIds = matches.map(match => 
//         match.user1.toString() === userId.toString() ? match.user2 : match.user1
//       );

//       // Sirf matched users ko include karein
//       query.userId.$in = matchedUserIds;
//     }

//     // 4. Distance filter (agar chahiye to)
//     if (filters.distance && currentUserProfile.location) {
//       const maxDistance = filters.distance * 1000; // Convert km to meters
//       query["location.coordinates"] = {
//         $near: {
//           $geometry: {
//             type: "Point",
//             coordinates: currentUserProfile.location.coordinates
//           },
//           $maxDistance: maxDistance
//         }
//       };
//     }

//     // 5. Age filter (agar chahiye to)
//     if (filters.ageRange) {
//       query.age = {
//         $gte: filters.ageRange.min || 18,
//         $lte: filters.ageRange.max || 100
//       };
//     }

//     // 6. Gender preference filter
//     if (filters.gender && filters.gender.length > 0) {
//       query.gender = { $in: filters.gender };
//     }

//     // 7. Query execute karein
//     const profiles = await Profile.find(query)
//       .populate('userId', 'name photos') // Required fields ko populate karein
//       .lean();

//     return profiles;

//   } catch (error) {
//     console.error("Error in getDiscoverableProfiles:", error);
//     throw error;
//   }
// }


module.exports = {
  getFeed,
  doSwipe,
  undoSwipe,
  // getDiscoverableProfiles,
  prefetchCandidates, // export for worker or cron prefetcher
  // constants exported for tests or admin
  SWIPE_QUEUE_PREFIX, SWIPED_SET_PREFIX
};

// async function getFeed(userId, limit = DEFAULT_FETCH_LIMIT) {
//   try {
//     // Load profile
//     const myProfile = await Profile.findOne({ userId }).lean();
//     if (!myProfile) throw new Error("Profile not found");

//     // Get list of blocked users
//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).select('actorId targetId').lean();

//     // Extract all user IDs involved in blocks
//     const blockedUserIds = blockedUsers.map(b => 
//       b.actorId.toString() === userId.toString() ? b.targetId : b.actorId
//     );

//     // If Redis is not available, fetch directly from DB
//     if (!redis) {
//       const query = buildCandidateQuery(myProfile, blockedUserIds);
//       // Add location filter if available
//       if (myProfile.location?.coordinates?.length > 0) {
//         query["location.coordinates"] = {
//           $nearSphere: {
//             $geometry: {
//               type: "Point",
//               coordinates: myProfile.location.coordinates
//             },
//             $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//           }
//         };
//       }
//       return await Profile.find(query)
//         .limit(limit)
//         .select("userId fullName nickname bio photos location dob gender interests")
//         .lean();
//     }

//     // Redis is available - check cache first
//     const queueKey = SWIPE_QUEUE_PREFIX + userId;
//     let ids = await redis.lRange(queueKey, 0, limit - 1).catch(() => []);
    
//     // If queue is empty, prefetch candidates
//     if (!ids || ids.length === 0) {
//       await prefetchCandidates(userId, myProfile, limit, blockedUserIds);
//       ids = await redis.lRange(queueKey, 0, limit - 1).catch(() => []);
//     }

//     if (!ids || ids.length === 0) {
//       return []; // No candidates found
//     }

//     // Fetch profiles from DB for the IDs in Redis
//     const objIds = ids.map(id => new mongoose.Types.ObjectId(id));
//     const profiles = await Profile.find({ 
//       _id: { $in: objIds },
//       userId: { $nin: blockedUserIds } // Exclude blocked users
//     })
//     .select("userId fullName nickname bio photos location dob gender interests")
//     .lean();

//     // Preserve order from Redis
//     const map = new Map(profiles.map(p => [p.userId.toString(), p]));
//     return ids.map(id => map.get(id)).filter(Boolean).slice(0, limit);

//   } catch (error) {
//     console.error('Error in getFeed:', error);
//     throw error;
//   }
// }




// Get next candidate(s) (pop from redis queue if possible), fallback to DB
// async function getFeed(userId, limit = DEFAULT_FETCH_LIMIT) {
//   // load profile (lean)
//   const myProfile = await Profile.findOne({ userId }).lean();
//   if (!myProfile) throw new Error("Profile not found");

//   if (!redis) {
//     // No redis: run DB query directly
//     const query = buildCandidateQuery(myProfile, []);
//     if (myProfile.location && Array.isArray(myProfile.location.coordinates) && myProfile.location.coordinates[0] !== 0) {
//       query["location.coordinates"] = {
//         $nearSphere: {
//           $geometry: {
//             type: "Point",
//             coordinates: myProfile.location.coordinates
//           },
//           $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//         }
//       };
//     }
//     const results = await Profile.find(query)
//       .limit(limit)
//       .select("userId fullName nickname bio photos location dob gender interests")
//       .lean();
//     return results;
//   }

//   const queueKey = SWIPE_QUEUE_PREFIX + userId;
//   // try pop N items without removing permanently (we'll lPop per card when delivered)
//   const ids = await redis.lRange(queueKey, 0, limit - 1).catch(() => []);
//   if (!ids || ids.length === 0) {
//     await prefetchCandidates(userId, myProfile, limit);
//   }

//   const finalIds = await redis.lRange(queueKey, 0, limit - 1).catch(() => []);
//   if (!finalIds || finalIds.length === 0) {
//     return []; // nothing found
//   }

//   // fetch profile details for these ids from DB
//   const objIds = finalIds.map(id => mongoose.Types.ObjectId(id));
//   const profiles = await Profile.find({ userId: { $in: objIds } })
//     .select("userId fullName nickname bio photos location dob gender interests")
//     .lean();

//   // preserve order of finalIds
//   const map = new Map(profiles.map(p => [p.userId.toString(), p]));
//   const ordered = finalIds.map(id => map.get(id)).filter(Boolean).slice(0, limit);

//   return ordered;
// }

// record a swipe and detect match
// async function doSwipe(swiperId, targetId, action) {
//   // basic validations
//   if (swiperId.toString() === targetId.toString()) throw new Error("Cannot swipe self");

//   // rate-limiting example (increase if necessary)
//   if (redis) {
//     const rateKey = SWIPE_RATE_PREFIX + swiperId;
//     const count = await redis.incr(rateKey).catch(() => null);
//     if (count === 1) await redis.expire(rateKey, 24 * 60 * 60);
//     // example: block once count > 1000 per day (adjust to your plan)
//     if (count && count > 5000) throw new Error("Rate limit exceeded");
//   }

//   // try inserting swipe (unique index will prevent duplicate)
//   try {
//     await Swipe.create({
//       swiperId,
//       targetId,
//       action
//     });
//   } catch (err) {
//     // duplicate swipe triggers E11000 code
//     if (err.code === 11000) {
//       return { already: true };
//     }
//     throw err;
//   }

//   // add to redis swiped set for quick exclusion
//   if (redis) await redis.sAdd(SWIPED_SET_PREFIX + swiperId, targetId.toString()).catch(() => {});

//   // If action is like/superlike, check reverse like
//   if (action === "like" || action === "superlike") {
//     // Find if the other user has already liked you
//     const reverseSwipe = await Swipe.findOne({
//       swiperId: targetId,
//       targetId: swiperId,
//       action: { $in: ["like", "superlike"] }
//     }).lean();

//     if (reverseSwipe) {
//       // Create match if it doesn't exist
//       const user1 = new mongoose.Types.ObjectId(swiperId);
//       const user2 = new mongoose.Types.ObjectId(targetId);
//       const users = [user1, user2].sort((a, b) => a.toString().localeCompare(b.toString()));

//       // Check if match already exists
//       let match = await Match.findOne({
//         users: { $all: [users[0], users[1]] }
//       });

//       if (!match) {
//         match = await Match.create({
//           users: users,
//           matchedAt: new Date()
//         });
//       }

//       // remove both from redis queues (best-effort)
//       if (redis) {
//         await redis.lRem(SWIPE_QUEUE_PREFIX + swiperId, 0, targetId.toString()).catch(()=>{});
//         await redis.lRem(SWIPE_QUEUE_PREFIX + targetId, 0, swiperId.toString()).catch(()=>{});
//       }

//       // return { match: true, match };
//        return { match: true, matchId: match._id };
//     }
//   }
//    return { success: true };

//   // return { ok: true };
// }


// In swipe.service.js
// async function doSwipe(swiperId, targetId, action) {
//   // Basic validation
//   if (swiperId.toString() === targetId.toString()) {
//     throw new Error("Cannot swipe on your own profile");
//   }

//   const session = await mongoose.startSession();
  
//   try {
//     await session.withTransaction(async () => {
//       // 1. Check for existing block
//       const blockExists = await userActionsModel.exists({
//         $or: [
//           { actorId: swiperId, targetId, actionType: 'block' },
//           { actorId: targetId, targetId: swiperId, actionType: 'block' }
//         ]
//       }).session(session);

//       if (blockExists) {
//         throw new Error("Action not allowed. User is blocked.");
//       }

//       // 2. Check for existing swipe
//       const existingSwipe = await Swipe.findOne({
//         userId: swiperId,
//         targetId
//       }).session(session);

//       if (existingSwipe) {
//         return { 
//           success: true, 
//           already: true, 
//           message: "Already swiped",
//           match: false
//         };
//       }

//       // 3. Create new swipe
//       await Swipe.create([{
//         swiperId,
//         targetId,
//         action,
//         createdAt: new Date()
//       }], { session });

//       // 4. Check for mutual like
//       if (['like', 'superlike'].includes(action)) {
//         const mutualSwipe = await Swipe.findOne({
//           userId: targetId,
//           targetId: swiperId,
//           action: { $in: ['like', 'superlike'] }
//         }).session(session);

//         if (mutualSwipe) {
//           // Create match
//           const match = await Match.create([{
//             users: [swiperId, targetId],
//             status: 'matched',
//             lastActivity: new Date()
//           }], { session });

//           // Update Redis if needed
//           if (redis) {
//             const queueKey1 = `${SWIPE_QUEUE_PREFIX}${swiperId}`;
//             const queueKey2 = `${SWIPE_QUEUE_PREFIX}${targetId}`;
            
//             await Promise.all([
//               redis.lRem(queueKey1, 0, targetId.toString()),
//               redis.lRem(queueKey2, 0, swiperId.toString())
//             ]);
//           }

//           return {
//             match: true,
//             matchId: match[0]._id,
//             message: "It's a match!"
//           };
//         }
//       }

//       return { match: false, message: "Swipe recorded" };
//     });

//     return { success: true, match: false, message: "Swipe processed" };

//   } catch (error) {
//     console.error('Swipe error:', error);
//     throw error;
//   } finally {
//     await session.endSession();
//   }
// }


// async function getFeed(userId, limit = 10) {
//   try {
//     console.log('=== डीबगिंग शुरू ===');
    
//     // 1. पहले यूजर प्रोफाइल फेच करें
//     const myProfile = await Profile.findOne({ userId }).lean();
//     console.log('यूजर ID:', userId);
//     console.log('प्रोफाइल मिली?', !!myProfile);
    
//     if (!myProfile) {
//       console.log('प्रोफाइल नहीं मिली');
//       return [];
//     }

//     // 2. ब्लॉक किए गए यूजर्स की लिस्ट बनाएं
//     const blockedUsers = await userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: 'block' },
//         { targetId: userId, actionType: 'block' }
//       ]
//     }).select('actorId targetId').lean();

//     const blockedUserIds = blockedUsers.map(b => 
//       b.actorId.toString() === userId.toString() ? b.targetId : b.actorId
//     );
//     console.log('ब्लॉक किए गए यूजर्स:', blockedUserIds);

//     // 3. डायरेक्ट क्वेरी चलाकर देखें
//     const query = {
//       userId: { 
//         $ne: userId,  // खुद को न दिखाएं
//         $nin: blockedUserIds  // ब्लॉक किए हुए यूजर्स को न दिखाएं
//       },
//       "photos.0": { $exists: true }  // कम से कम एक फोटो हो
//     };

//     // 4. जेंडर प्रेफरेंस जोड़ें (अगर सेट है)
//     if (myProfile.preferences?.genderPreference?.length > 0) {
//       query.gender = { $in: myProfile.preferences.genderPreference };
//     }
//     console.log('जेंडर प्रेफरेंस:', myProfile.preferences?.genderPreference);

//     // 5. लोकेशन फिल्टर (अगर उपलब्ध हो)
//     if (myProfile.location?.coordinates?.length === 2) {
//       query["location.coordinates"] = {
//         $nearSphere: {
//           $geometry: {
//             type: "Point",
//             coordinates: myProfile.location.coordinates
//           },
//           $maxDistance: (myProfile.preferences?.distanceRange || 50) * 1000
//         }
//       };
//       console.log('लोकेशन फिल्टर लगा हुआ है');
//     } else {
//       console.log('लोकेशन डेटा नहीं मिला या अमान्य है');
//     }

//     console.log('फाइनल क्वेरी:', JSON.stringify(query, null, 2));

//     // 6. क्वेरी चलाएं
//     const profiles = await Profile.find(query)
//       .limit(limit)
//       .select("userId fullName nickname bio photos location dob gender interests")
//       .lean();

//     console.log('कुल मिले प्रोफाइल्स:', profiles.length);
//     return profiles;

//   } catch (error) {
//     console.error('फीड फेच करने में त्रुटि:', error);
//     return [];
//   }
// }
