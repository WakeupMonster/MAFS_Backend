/* eslint-disable no-unused-vars */
/* eslint-disable no-dupe-keys */
// Core swipe logic & Redis integration
const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const Swipe = require("./swipe.model"); // may export Swipe and Match - adjust import
const { Match } = require("./swipe.model");
const mongoose = require("mongoose");
// const userActionsModel = require("./BlockReport/userActions.model");
const Block = require("../../../modules/profile/user.block");
const Report = require("../../../modules/profile/user.report");
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

// Helper for Exact Distance (Ensure this is in your file)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c); 
}

async function getFeedService(userId, limit = 20) {
    const CACHE_KEY = `feed:${userId.toString()}`;
    const CACHE_TTL = 300;

    // 1️⃣ User Profile & Filters Fetch
    const myProfile = await Profile.findOne({ userId }).lean();
    if (!myProfile) throw new Error("Profile not found");

    if (!myProfile.isDiscoverable || !myProfile.location?.coordinates) {
        return { success: false, message: "Complete profile & location required", data: [], onboardingRequired: true };
    }

    // 2️⃣ Redis Cache Check
    if (redis) {
        try {
            const cached = await redis.get(CACHE_KEY);
            if (cached)
              console.log("Feed from redis")
              return { success: true, count: JSON.parse(cached).data?.length, cached: true, data: JSON.parse(cached).data };
        } catch (err) { console.error("Redis Error:", err); }
    }

    // 3️⃣ Exclusion Lists (Swipes, Blocks, etc.)
    const [swipes,          // 1. Maine kise like/pass kiya
    matches,         // 2. Mere matches
    myBlocked,       // 3. Maine kise block kiya
    blockedMe,       // 4. Mujhe kisne block kiya
    myReports,       // 5. Maine kise report kiya
    superlikes] = await Promise.all([
        Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
        Match.find({ users: userId }).distinct("users"),
        // userActionsModel.find({ $or: [{ actorId: userId }, { targetId: userId }] }).distinct("targetId"),
        Block.find({ blockerId: userId }).distinct("blockedId"),
        // Jinhone mujhe block kiya
        Block.find({ blockedId: userId }).distinct("blockerId"),
        // Maine jinhe report kiya (unhe bhi feed se hata dena chahiye)
        Report.find({ reporterId: userId }).distinct("reportedId"),
        Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId")
    ]);


    const blockedPhoneHashes = await BlockedContact.find({
  userId
}).distinct("blockedPhoneHash");

let blockedByContactUserIds = [];

if (blockedPhoneHashes.length) {
  const users = await User.find({
    phoneHash: { $in: blockedPhoneHashes }
  }).distinct("_id");

  blockedByContactUserIds = users.map(id => id.toString());
}


    const superlikeSet = new Set(superlikes.map(id => id.toString()));
    console.log(superlikeSet,"superlikeSet")
    const excludeIds = [...new Set([...swipes, 
        ...matches, 
        ...myBlocked, 
        ...blockedMe, 
        ...myReports,...blockedByContactUserIds, userId])].map(id => id.toString());

    // 4️⃣ Strict Query Building (Discovery Filters)
    const discovery = myProfile.discovery || {};
    const query = { userId: { $nin: excludeIds }, isDiscoverable: true, isMandatoryComplete: true };
    
    // Gender & Age Filters
    if (discovery.showMeGender?.length) query.gender = { $in: discovery.showMeGender };
    if (discovery.ageRange) {
        const now = new Date();
        query.dob = {
            $gte: new Date(now.getFullYear() - (discovery.ageRange.max || 50), 0, 1),
            $lte: new Date(now.getFullYear() - (discovery.ageRange.min || 18), 11, 31)
        };
    }

    // HARD FILTER: Has a Bio (Figma Requirement)
    if (discovery.hasBio) {
        query.about = { $exists: true, $ne: "" };
    }

    // Location Radius
    if (myProfile.location?.coordinates) {
        query.location = {
            $near: {
                $geometry: { type: "Point", coordinates: myProfile.location.coordinates },
                $maxDistance: (discovery.distanceRange || 50) * 1000
            }
        };
    }

    // 5️⃣ DB Fetch
    const profiles = await Profile.find(query).limit(50).lean();

    // 6️⃣ Figma Scoring Engine
    const myPreferredInterests = discovery.preferredInterests || [];
    const myAdvancedFilters = discovery.advancedFilters || {};
    // Overwrite protection: Agar filterRelationshipGoal hai toh wo lo, warna profile goal
    const activeSearchGoal = discovery.filterRelationshipGoal || discovery.relationshipGoal;
const transformedProfiles = profiles.map((profile) => {
    const targetAttr = profile.attributes || {};
    const targetInterests = targetAttr.interests || profile.interests || [];
    const isSuperliked = superlikeSet.has(profile.userId.toString());
    console.log(isSuperliked,"has in set")
    // 1️⃣ Match Score Calculation (Score Logic Same Rakhenge)
    let score = isSuperliked ? 1000 : 0;
    const common = targetInterests.filter(i => myPreferredInterests.includes(i));
    score += (common.length * 25);
    
    const targetGoal = profile.discovery?.relationshipGoal;
    if (targetGoal === activeSearchGoal) score += 40;

const matchedTraits = [];
    // Advanced Traits Match (+15 points each)
const traits = ['smoking', 'drinking', 'zodiac', 'pets', 'workout'];
traits.forEach(trait => {
    if (myAdvancedFilters[trait] && targetAttr[trait] === myAdvancedFilters[trait]) {
        score += 15;
        matchedTraits.push(targetAttr[trait]);
    }
});
    

    // 2️⃣ Distance calculation
    let distanceKm = 0;
    if (myProfile.location?.coordinates && profile.location?.coordinates) {
        distanceKm = calculateDistance(
            myProfile.location.coordinates[1], myProfile.location.coordinates[0], 
            profile.location.coordinates[1], profile.location.coordinates[0]
        );
    }

    // 3️⃣ Frontend "Hand-holding" logic (Card Highlights)
    // Ye array frontend ko batayega ki pehle card par kya dikhana hai aur dusre par kya
    const cardHighlights = [];
    if (common.length > 0) cardHighlights.push(`You both love ${common[0]}`);
    if (targetGoal) cardHighlights.push(`Looking for: ${targetGoal}`);
    if (distanceKm <= 5) cardHighlights.push(`Very close to you!`);
    if (score > 75) cardHighlights.push(`${score}% Compatible`);





    // const dynamicHighlights = [];

    // // Card 1: Vibe Match (Interests)
    // if (common.length > 0) {
    //     dynamicHighlights.push({
    //         type: "INTEREST_MATCH",
    //         icon: "🔥",
    //         title: "Common Vibe",
    //         description: `You both love ${common[0]}${common.length > 1 ? ` & ${common.length - 1} more` : ""}`
    //     });
    // }

    // // Card 2: Relationship Goal Match
    // if (targetGoal === activeSearchGoal) {
    //     dynamicHighlights.push({
    //         type: "GOAL_MATCH",
    //         icon: "🎯",
    //         title: "Same Intent",
    //         description: `Both looking for ${targetGoal}`
    //     });
    // }

    // // Card 3: Lifestyle/Trait Match
    // if (matchedTraits.length > 0) {
    //     dynamicHighlights.push({
    //         type: "TRAIT_MATCH",
    //         icon: "✅",
    //         title: "Lifestyle Match",
    //         description: `You match on ${matchedTraits[0]} habits`
    //     });
    // }

    // // Card 4: Distance/Location
    // dynamicHighlights.push({
    //     type: "LOCATION",
    //     icon: "📍",
    //     title: "Nearby",
    //     description: distanceKm <= 1 ? "In your neighborhood" : `${distanceKm} km away`
    // });

    // // Card 5: Compatibility (Excellent/Great)
    // dynamicHighlights.push({
    //     type: "COMPATIBILITY",
    //     icon: "✨",
    //     // title: compatibilityLabel,
    //     compatibilityLabel: score > 75 ? "Excellent Match" : (score > 40 ? "Great Match" : "Good Match"),
    //     description: `${score}% Compatible with your profile`
    // });

    // // Card 6: New User / Verification Status
    // if (profile.verification?.status === "approved") {
    //     dynamicHighlights.push({
    //         type: "VERIFIED",
    //         icon: "🛡️",
    //         title: "Verified Profile",
    //         description: "Authenticity checked by MAFS"
    //     });
    // } else {
    //     dynamicHighlights.push({
    //         type: "NEW_JOINER",
    //         icon: "🎈",
    //         title: "Fresh Face",
    //         description: "Just joined the community"
    //     });
    //   }
const dynamicHighlights = [];

// --- 1. Priority Matches (Real Data) ---
if (common.length > 0) {
    dynamicHighlights.push({ type: "INTEREST_MATCH", icon: "🔥", title: "Common Vibe", description: `You both love ${common[0]}` });
}
if (targetGoal === activeSearchGoal) {
    dynamicHighlights.push({ type: "GOAL_MATCH", icon: "🎯", title: "Same Intent", description: `Both looking for ${targetGoal}` });
}
if (matchedTraits.length > 0) {
    dynamicHighlights.push({ type: "TRAIT_MATCH", icon: "✅", title: "Lifestyle", description: `Matches on ${matchedTraits[0]} habits` });
}

// --- 2. Essential Info (Hamesha hoti hai) ---
dynamicHighlights.push({ type: "LOCATION", icon: "📍", title: "Nearby", description: distanceKm <= 1 ? "In your neighborhood" : `${distanceKm} km away` });

if (profile.verification?.status === "approved") {
    dynamicHighlights.push({ type: "VERIFIED", icon: "🛡️", title: "Verified", description: "Authenticity checked by MAFS" });
}

// --- 3. Fallbacks (Jab 6 cards pure karne ho) ---
if (dynamicHighlights.length < 6) {
    // Fallback: Bio Card
    if (profile.about && profile.about.length > 20) {
        dynamicHighlights.push({ type: "BIO_PREVIEW", icon: "✍️", title: "About Me", description: profile.about.substring(0, 40) + "..." });
    }
    
    // Fallback: Freshness Card
    dynamicHighlights.push({ type: "ACTIVITY", icon: "⚡", title: "Active Now", description: "This user is looking for a match!" });
    
    // Fallback: Quality Card
    if (profile.photos.length > 3) {
        dynamicHighlights.push({ type: "PHOTO_QUALITY", icon: "📸", title: "Photo Gallery", description: "Check out more moments" });
    }
}
    

    return {
        // --- Core Info ---
        id: profile.userId,
        nickname: profile.nickname || "User",
        displayName: `${profile.nickname || "User"}, ${calculateAge(profile.dob)}`,
        age: calculateAge(profile.dob),
        bio: profile.about || profile.bio || "",
        images: (profile.photos || []).sort((a,b) => a.order - b.order).map(p => p.url),
        
        // --- Discovery/Matching Info ---
        relationshipGoal: targetGoal || "Not specified",
        interests: targetInterests,
        traits: {
            // Basics
            zodiac: targetAttr.zodiac || "",
            education: targetAttr.education || "",
            vaccineStatus: targetAttr.vaccineStatus || "",
            familyPlans: targetAttr.familyPlans || "",
            personalityType: targetAttr.personalityType || "",
            communicationStyle: targetAttr.communicationStyle || "",
            loveStyle: targetAttr.loveStyle || "",
            bloodType: targetAttr.bloodType || "",
            
            // Lifestyle
            pets: targetAttr.pets || "",
            drinking: targetAttr.drinking || "",
            smoking: targetAttr.smoking || "",
            workout: targetAttr.workout || "",
            dietary: targetAttr.dietary || "",
            socialMedia: targetAttr.socialMedia || "",
            sleeping: targetAttr.sleeping || ""
        },
        matchedTraits: matchedTraits,
        commonInterests: common,
        hasCommonInterests: common.length > 0,
        matchScoreTotal: score,
        
        // --- Score & Labeling ---
        matchScore: Math.min(score, 100), // Score 100 se upar na dikhe UI par
        compatibilityLabel: score > 75 ? "Excellent Match" : (score > 40 ? "Great Match" : "Good Match"),
        
        // --- Status Flags ---
        isSuperKeen: isSuperliked,
        isVerified: profile.verification?.status === "approved",
        
        // --- Frontend UI Helpers ---
        distanceText: distanceKm <= 1 ? "1 km away" : `${distanceKm} km away`,
        // location: {
        //     city: profile.location?.city || "Indore",
        //     distance: distanceKm
        // },
        city: profile.location?.city || "",
        // Frontend ko har card ke liye ready-made text mil gaya
        displayHighlight: cardHighlights[0] || "New for you", 
        allHighlights: cardHighlights,
        dynamicHighlights: dynamicHighlights.slice(0, 6)
    };
});
    // const transformedProfiles = profiles.map((profile) => {
    //     const targetAttr = profile.attributes || {};
    //     const targetInterests = targetAttr.interests || profile.interests || [];
    //     const isSuperliked = superlikeSet.has(profile.userId.toString());
        
    //     // Match Score Calculation
    //     let score = isSuperliked ? 1000 : 0;

    //     // Interest Match (+25 points each)
    //     const common = targetInterests.filter(i => myPreferredInterests.includes(i));
    //     score += (common.length * 25);

    //     // Relationship Goal Match (+40 points)
    //     if (profile.discovery?.relationshipGoal === activeSearchGoal) {
    //         score += 40;
    //     }

    //     // Advanced Traits Match (+15 points each)
    //     const traits = ['smoking', 'drinking', 'zodiac', 'pets', 'workout'];
    //     traits.forEach(trait => {
    //         if (myAdvancedFilters[trait] && targetAttr[trait] === myAdvancedFilters[trait]) {
    //             score += 15;
    //         }
    //     });

    //     // Exact Distance Calculation
    //     let distanceKm = 0;
    //     if (myProfile.location?.coordinates && profile.location?.coordinates) {
    //         distanceKm = calculateDistance(
    //             myProfile.location.coordinates[1], myProfile.location.coordinates[0], 
    //             profile.location.coordinates[1], profile.location.coordinates[0]
    //         );
    //     }

    //     // --- Frontend Friendly Response (Figma exact match) ---
    //     return {
    //         id: profile.userId,
    //         nickname: profile.nickname || "User",
    //         displayName: `${profile.nickname || "User"}, ${calculateAge(profile.dob)}`,
    //         dob : profile.dob.toISOString().split("T")[0] || "",
    //         age: calculateAge(profile.dob),
    //         city: profile.location?.city || "Indore",
    //         bio: profile.about || profile.bio || "",
    //         images: (profile.photos || []).sort((a,b) => a.order - b.order).map(p => p.url),
    //         interests: targetInterests,
    //         distanceText: distanceKm <= 1 ? "1 km away" : `${distanceKm} km away`,
    //         isSuperKeen: isSuperliked,
    //         intentMessage: isSuperliked ? "They chose you with intent!" : "",
    //         relationshipGoal: profile.discovery?.relationshipGoal || "",
    //         commonInterests: common,
    //         hasCommonInterests: common.length > 0,
    //         matchScore: score,
    //         compatibilityLabel: score > 75 ? "Excellent Match" : (score > 40 ? "Great Match" : "Good Match"),
          
    //             // distance: distanceKm
            
    //     };
    // });

    // Sort by Match Score (Highest first)
    transformedProfiles.sort((a, b) => b.matchScore - a.matchScore);
    const finalResult = transformedProfiles.slice(0, limit);

    // 7️⃣ Cache Response
    if (redis && finalResult.length) {
        await redis.set(CACHE_KEY, JSON.stringify({ data: finalResult }), 'EX', CACHE_TTL);
    }

    return { success: true, count: finalResult.length, data: finalResult };
}

function calculateAge(dob) {
    if (!dob) return 0;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / 31557600000); // Years in ms
}





















// async function getFeedService(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const CACHE_TTL = 300; // 5 minutes

//   console.log(CACHE_KEY, "cache key");

//   // ===============================
//   // STEP 1️⃣: Redis se feed try karo
//   // ===============================
//   if (redis) {
//     try {
//       const cached = await redis.get(CACHE_KEY);
//       if (cached) {
//         console.log("✅ FEED FROM REDIS");
//         const parsed = JSON.parse(cached);
//         return {
//           data: parsed.data || parsed, // ✅ backward compatible
//           cached: true
//         };
//       }
//     } catch (err) {
//       console.error("❌ Redis GET error:", err);
//     }
//   }

//   console.log("❌ REDIS MISS → DB SE FEED");

//   // ================================
//   // STEP 2️⃣: Current user ka profile
//   // ================================
//   const myProfile = await Profile.findOne({ userId })
//     .select("preferences location interests discoveryFilters isDiscoverable")
//     .lean();

//   if (!myProfile) throw new Error("Profile not found");

//   // ================================
//   // STEP 3️⃣: Superlikes nikalo 
//   // ================================
//   const superlikes = await Swipe.find({
//     targetId: userId,
//     action: "superlike"
//   }).select("swiperId").lean();

//   const superlikeSet = new Set(
//     superlikes.map(s => s.swiperId.toString())
//   );

//   // ================================
//   // STEP 4️⃣: Swipes + Matches + Block
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
//   const blockedPhoneHashes = await BlockedContact.find({
//     userId
//   }).distinct("blockedPhoneHash");

//   // 🔹 Step 4.2: un phone hashes se users nikaalo
//   let blockedUserIdsByPhone = [];

//   if (blockedPhoneHashes.length) {
//     const users = await User.find({
//       phoneHash: { $in: blockedPhoneHashes }
//     }).select("_id");

//     blockedUserIdsByPhone = users.map(u => u._id.toString());
//   }

//   // ================================
//   // STEP 5️⃣: Exclude list (superlike safe)
//   // ================================
//   const excludeIds = [
//     ...swipes.map(s => s.targetId.toString()),
//     ...matchedIds,
//     ...blocked.map(id => id.toString()),
//     ...blockedUserIdsByPhone,
//     userId.toString()
//   ].filter(id => !superlikeSet.has(id));

//   // ================================
//   // STEP 6️⃣: HARD DISCOVERY FILTERS
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

  

//   // ================================
//   // STEP 7️⃣: DB se profiles lao
//   // ================================
//   const fetchLimit = Math.min(limit * 3, 100);

//   let profiles = await Profile.find(query)
//     .limit(fetchLimit)
//     .select("userId nickname bio photos location dob gender interests createdAt")
//     .lean();

//   // ================================
//   // STEP 8️⃣: SOFT DISCOVERY (SCORING)
//   // ================================
//   const feedInterests =
//     myProfile.discoveryFilters?.interests?.length > 0
//       ? myProfile.discoveryFilters.interests
//       : myProfile.interests;

//   const interestSet = new Set(feedInterests || []);
//   const now = new Date();

//   const scoredProfiles = [];

//   for (const profile of profiles) {
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     let score = isSuperliked ? 1000 : 0;

//     // 🔥 BOOST CHECK (ONLY if NOT superliked)
//     if (!isSuperliked && redis) {
//       try {
//         const boosted = await redis.get(`boost:${profile.userId.toString()}`);
//         if (boosted) {
//           score += 200; // boost score
//         }
//       } catch (err) {
//         console.error("❌ Boost check error:", err);
//       }
//     }

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

//     scoredProfiles.push({
//       ...profile,
//       _matchScore: score,
//       superlikedBy: isSuperliked
//     });
//   }

//   // ================================
//   // STEP 9️⃣: Sorting
//   // ================================
//   scoredProfiles.sort((a, b) => {
//     if (a.superlikedBy !== b.superlikedBy) return a.superlikedBy ? -1 : 1;
//     if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
//     return new Date(b.createdAt) - new Date(a.createdAt);
//   });

//   const result = scoredProfiles.slice(0, limit);

//   // ================================
//   // STEP 🔟: Redis cache save
//   // ================================
//   if (redis && result.length) {
//     try {
//       await redis.set(
//         CACHE_KEY,
//         JSON.stringify({
//           data: result,
//           cachedAt: Date.now()
//         }),
//         { EX: CACHE_TTL }
//       );
//     } catch (err) {
//       console.error("❌ Redis SET error:", err);
//     }
//   }

//   return {
//     data: result,
//     cached: false
//   };
// }


// first optimized version
// async function getFeedService(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const CACHE_TTL = 300; // 5 minutes

//   // 1️⃣ REDIS CHECK (Using your wrapper's 'get')
//   if (redis) {
//     try {
//       const cached = await redis.get(CACHE_KEY);
//       if (cached) {
//         console.log("Feed from redis")
//         const parsed = JSON.parse(cached);
//         return {
//           success: true,
//           count: parsed.data?.length || 0,
//           cached: true,
//           data: parsed.data || parsed
//         };
//       }
//     } catch (err) {
//       console.error("❌ Redis GET error:", err);
//     }
//   }

//   // 2️⃣ PRE-FETCH (Parallel Execution for speed)
//   // Aapke models aur relations ke hisab se constant logic
//   const myProfile = await Profile.findOne({ userId }).lean();
//   if (!myProfile) throw new Error("Profile not found");

//   const [swipes, matches, blocked, superlikes, blockedPhoneHashes] = await Promise.all([
//     Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
//     Match.find({ users: userId }).distinct("users"),
//     userActionsModel.find({
//       $or: [
//         { actorId: userId, actionType: { $in: ["block", "report"] } },
//         { targetId: userId, actionType: "block" }
//       ]
//     }).distinct("targetId"),
//     Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId"),
//     BlockedContact.find({ userId }).distinct("blockedPhoneHash")
//   ]);

//   let blockedUserIdsByPhone = [];
//   if (blockedPhoneHashes.length) {
//     const users = await User.find({ phoneHash: { $in: blockedPhoneHashes } }).distinct("_id");
//     blockedUserIdsByPhone = users.map(id => id.toString());
//   }

//   // 3️⃣ EXCLUDE LIST
//   const superlikeSet = new Set(superlikes.map(id => id.toString()));
//   const excludeIds = [
//     ...swipes.map(id => id.toString()),
//     ...matches.map(id => id.toString()),
//     ...blocked.map(id => id.toString()),
//     ...blockedUserIdsByPhone,
//     userId.toString()
//   ].filter(id => !superlikeSet.has(id));

//   // 4️⃣ QUERY BUILDING
//   const query = {
//     userId: { $nin: excludeIds },
//     isDiscoverable: true
//   };

//   if (myProfile.preferences?.genderPreference?.length) {
//     query.gender = { $in: myProfile.preferences.genderPreference };
//   }

//   if (myProfile.preferences?.ageRange) {
//     const now = new Date();
//     query.dob = {
//       $gte: new Date(now.getFullYear() - myProfile.preferences.ageRange.max, 0, 1),
//       $lte: new Date(now.getFullYear() - myProfile.preferences.ageRange.min, 11, 31)
//     };
//   }

//   if (myProfile.location?.coordinates && myProfile.preferences?.distanceRange) {
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

//   // 5️⃣ DB FETCH
//   const fetchLimit = Math.min(limit * 3, 100);
//   let profiles = await Profile.find(query)
//     .limit(fetchLimit)
//     .select("userId nickname bio photos location dob gender interests createdAt")
//     .lean();

//   // 6️⃣ SCORING & BOOST CHECK (Safe Promise.all approach)
//   const interestSet = new Set(myProfile.discoveryFilters?.interests || myProfile.interests || []);
//   const now = new Date();

//   // Isse Error nahi aayega kyunki 'redis.get' aapne already export kiya hai
//   let boostedResults = [];
//   if (redis && profiles.length) {
//     const boostPromises = profiles.map(p => redis.get(`boost:${p.userId.toString()}`));
//     boostedResults = await Promise.all(boostPromises);
//   }

//   const scoredProfiles = profiles.map((profile, index) => {
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     let score = isSuperliked ? 1000 : 0;

//     // Redis boost score
//     if (!isSuperliked && boostedResults[index]) {
//       score += 200;
//     }

//     if (interestSet.size && profile.interests?.length) {
//       const common = profile.interests.filter(i => interestSet.has(i)).length;
//       score += common * 10;
//     }

//     if (profile.bio) score += 5;

//     const daysOld = (now - new Date(profile.createdAt)) / (1000 * 60 * 60 * 24);
//     if (daysOld < 7) score += 5;

//     return {
//       ...profile,
//       _matchScore: score,
//       superlikedBy: isSuperliked
//     };
//   });

//   // 7️⃣ SORT & SLICE
//   scoredProfiles.sort((a, b) => {
//     if (a.superlikedBy !== b.superlikedBy) return a.superlikedBy ? -1 : 1;
//     if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
//     return new Date(b.createdAt) - new Date(a.createdAt);
//   });

//   const result = scoredProfiles.slice(0, limit);

//   // 8️⃣ CACHE SAVE (Using your wrapper's 'set')
//   if (redis && result.length) {
//     await redis.set(CACHE_KEY, { data: result }, { EX: CACHE_TTL });
//   }

//   return {
//     success: true,
//     count: result.length,
//     cached: false,
//     data: result
//   };
// }





// async function getFeedService(userId, limit = 20) {

  
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const CACHE_TTL = 300;
  
// function calculateDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371; // Earth radius in km
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a = 
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return Math.round(R * c); // Returns distance in km
// }
//   if (redis) {
//     try {
//       const cached = await redis.get(CACHE_KEY);
//       if (cached) {
//         const parsed = JSON.parse(cached);
//         return { success: true, count: parsed.data?.length || 0, cached: true, data: parsed.data || parsed };
//       }
//     } catch (err) { console.error("❌ Redis GET error:", err); }
//   }

//   const myProfile = await Profile.findOne({ userId }).lean();
//   if (!myProfile) throw new Error("Profile not found");

//   const [swipes, matches, blocked, superlikes, blockedPhoneHashes] = await Promise.all([
//     Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
//     Match.find({ users: userId }).distinct("users"),
//     userActionsModel.find({
//       $or: [{ actorId: userId, actionType: { $in: ["block", "report"] } }, { targetId: userId, actionType: "block" }]
//     }).distinct("targetId"),
//     Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId"),
//     BlockedContact.find({ userId }).distinct("blockedPhoneHash")
//   ]);

//   let blockedUserIdsByPhone = [];
//   if (blockedPhoneHashes.length) {
//     const users = await User.find({ phoneHash: { $in: blockedPhoneHashes } }).distinct("_id");
//     blockedUserIdsByPhone = users.map(id => id.toString());
//   }

//   const superlikeSet = new Set(superlikes.map(id => id.toString()));
//   const excludeIds = [...new Set([
//     ...swipes.map(id => id.toString()),
//     ...matches.map(id => id.toString()),
//     ...blocked.map(id => id.toString()),
//     ...blockedUserIdsByPhone,
//     userId.toString()
//   ])].filter(id => !superlikeSet.has(id));

//   const query = { userId: { $nin: excludeIds }, isDiscoverable: true };
  
//   // Safe Preferences Check
//   const prefs = myProfile.preferences || {};
  
//   if (prefs.genderPreference?.length) query.gender = { $in: prefs.genderPreference };
  
//   if (prefs.ageRange) {
//     const now = new Date();
//     query.dob = {
//       $gte: new Date(now.getFullYear() - (prefs.ageRange.max || 50), 0, 1),
//       $lte: new Date(now.getFullYear() - (prefs.ageRange.min || 18), 11, 31)
//     };
//   }

//   if (myProfile.location?.coordinates && prefs.distanceRange) {
//     query.location = {
//       $near: {
//         $geometry: { type: "Point", coordinates: myProfile.location.coordinates },
//         $maxDistance: prefs.distanceRange * 1000
//       }
//     };
//   }

//   const profiles = await Profile.find(query)
//     .limit(limit * 2)
//     .select("userId nickname bio photos location dob gender interests createdAt")
//     .lean();

//   let boostedResults = [];
//   if (redis && profiles.length) {
//     try {
//         const boostPromises = profiles.map(p => redis.get(`boost:${p.userId.toString()}`));
//         boostedResults = await Promise.all(boostPromises);
//     } catch (e) { boostedResults = []; }
//   }

//   const interestSet = new Set(myProfile.discoveryFilters?.interests || myProfile.interests || []);
//   const now = new Date();

//   const transformedProfiles = profiles.map((profile, index) => {
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     const isBoosted = !!boostedResults[index];
    
//     let score = isSuperliked ? 1000 : 0;
//     if (isBoosted) score += 200;
//     if (interestSet.size && profile.interests?.length) {
//       score += (profile.interests.filter(i => interestSet.has(i)).length) * 10;
//     }

//     // Safe Age Calculation
//     let age = 0;
//     if (profile.dob) {
//         const birthDate = new Date(profile.dob);
//         age = now.getFullYear() - birthDate.getFullYear();
//         const m = now.getMonth() - birthDate.getMonth();
//         if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
//     }

//     // ✅ FIXED: Safe Distance Check
//     // let distanceText = "Near you"; 
//     // if (prefs.distanceRange) {
//     //     distanceText = `${prefs.distanceRange} km away`;
//     // }

//     // ✅ EXACT DISTANCE CALCULATION
//     let distanceText = "Near you";
//     if (myProfile.location?.coordinates && profile.location?.coordinates) {
//         const [lon1, lat1] = myProfile.location.coordinates;
//         const [lon2, lat2] = profile.location.coordinates;
//         const km = calculateDistance(lat1, lon1, lat2, lon2);
        
//         distanceText = km <= 1 ? "Less than 1 km away" : `${km} km away`;
//     }

//     return {
//       id: profile.userId,
//       displayName: age > 0 ? `${profile.nickname}, ${age}` : profile.nickname,
//       nickname: profile.nickname,
//       age: age,
//       bio: profile.bio || "",
//       images: (profile.photos || []).sort((a,b) => a.order - b.order).map(p => p.url),
//       interests: profile.interests || [],
//       distanceText: distanceText,
//       isSuperKeen: isSuperliked,
//       isBoosted: isBoosted,
//       intentMessage: isSuperliked ? "They chose you with intent!" : null,
//       _matchScore: score,
//       createdAt: profile.createdAt
//     };
//   });

//   transformedProfiles.sort((a, b) => {
//     if (a.isSuperKeen !== b.isSuperKeen) return a.isSuperKeen ? -1 : 1;
//     return b._matchScore - a._matchScore;
//   });

//   const finalResult = transformedProfiles.slice(0, limit);

//   if (redis && finalResult.length) {
//     await redis.set(CACHE_KEY, { data: finalResult }, { EX: CACHE_TTL });
//   }

//   return { success: true, count: finalResult.length, cached: false, data: finalResult };
// }





// Function ke bahar sabse upar (Helper)
// function calculateDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371; 
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a = 
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return Math.round(R * c);
// }




// ye done wala hain
// async function getFeedService(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const CACHE_TTL = 300;

//   // 1️⃣ Profile Fetch
//   const myProfile = await Profile.findOne({ userId }).lean();
//   if (!myProfile) throw new Error("Profile not found");

//   if (!myProfile.isDiscoverable || !myProfile.location?.coordinates) {
//     return { success: false, message: "Profile incomplete", data: [], onboardingRequired: true };
//   }

//   // 2️⃣ REDIS CHECK
//   if (redis) {
//     try {
//       const cached = await redis.get(CACHE_KEY);
//       if (cached) return { success: true, count: JSON.parse(cached).data?.length, cached: true, data: JSON.parse(cached).data };
//     } catch (err) { console.error("Redis Error:", err); }
//   }

//   // 3️⃣ PARALLEL DATA FETCH (Existing logic)
//   const [swipes, matches, blocked, superlikes] = await Promise.all([
//     Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
//     Match.find({ users: userId }).distinct("users"),
//     userActionsModel.find({ $or: [{ actorId: userId }, { targetId: userId }] }).distinct("targetId"),
//     Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId")
//   ]);

//   const superlikeSet = new Set(superlikes.map(id => id.toString()));
//   const excludeIds = [...new Set([...swipes, ...matches, ...blocked, userId])].map(id => id.toString());

//   // 4️⃣ QUERY BUILDING
//   const discovery = myProfile.discovery || {};
//   const query = { 
//     userId: { $nin: excludeIds }, 
//     isDiscoverable: true 
//   };
  
//   if (discovery.showMeGender?.length) query.gender = { $in: discovery.showMeGender };
  
//   if (discovery.ageRange) {
//     const now = new Date();
//     query.dob = {
//       $gte: new Date(now.getFullYear() - (discovery.ageRange.max || 35), 0, 1),
//       $lte: new Date(now.getFullYear() - (discovery.ageRange.min || 18), 11, 31)
//     };
//   }

//   if (myProfile.location?.coordinates) {
//     query.location = {
//       $near: {
//         $geometry: { type: "Point", coordinates: myProfile.location.coordinates },
//         $maxDistance: (discovery.distanceRange || 50) * 1000
//       }
//     };
//   }

//   // 5️⃣ DB FETCH
//   const profiles = await Profile.find(query).limit(50).lean();

//   // 6️⃣ SAFE SCORING ENGINE (Error Fixed Here)
//   const myInterests = discovery.preferredInterests || [];
//   const myAdvanced = discovery.advancedFilters || {};

//   const transformedProfiles = profiles.map((profile) => {
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     const targetAttr = profile.attributes || {}; // Fallback to empty object
    
//     // Yahan ho rahi thi galti - ab safe check hai
//     const targetInterests = targetAttr.interests || profile.interests || []; 
//     const common = Array.isArray(targetInterests) 
//                    ? targetInterests.filter(i => myInterests.includes(i)) 
//                    : [];

//     let score = isSuperliked ? 1000 : 0;
//     score += common.length * 20;

//     // Advanced trait scoring with safe checks
//     if (myAdvanced.smoking && targetAttr.smoking === myAdvanced.smoking) score += 10;
//     if (myAdvanced.drinking && targetAttr.drinking === myAdvanced.drinking) score += 10;

//         let distanceText = "Near you";
//     if (myProfile.location?.coordinates && profile.location?.coordinates) {
//         const [lon1, lat1] = myProfile.location.coordinates;
//         const [lon2, lat2] = profile.location.coordinates;
//         const km = calculateDistance(lat1, lon1, lat2, lon2);
        
//         distanceText = km <= 1 ? "Less than 1 km away" : `${km} km away`;
//     }


//     return {
//       id: profile.userId,
//       nickname: profile.nickname || "User",
//       age: calculateAge(profile.dob),
//       bio: profile.about || profile.bio || "",
//       images: (profile.photos || []).sort((a,b) => a.order - b.order).map(p => p.url),
//       interests: targetInterests,
//       distanceText: distanceText,
//       matchScore: score,
//       commonInterests: common
//     };
//   });

//   transformedProfiles.sort((a, b) => b.matchScore - a.matchScore);
//   const finalResult = transformedProfiles.slice(0, limit);

//   if (redis && finalResult.length) {
//     await redis.set(CACHE_KEY, JSON.stringify({ data: finalResult }), 'EX', CACHE_TTL);
//   }

//   return { success: true, count: finalResult.length, data: finalResult };
// }

// function calculateAge(dob) {
//   if (!dob) return 0;
//   return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
// }
// // // final ready wala tha
// async function getFeedService(userId, limit = 20) {
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const CACHE_TTL = 300;

//   // 1️⃣ Profile Fetch
//   const myProfile = await Profile.findOne({ userId }).lean();
//   if (!myProfile) throw new Error("Profile not found");

//   // 🚨 GATEKEEPER CHECK: Location aur Discovery check
//   if (!myProfile.isDiscoverable || !myProfile.location?.coordinates) {
//     return {
//       success: false,
//       message: "Please complete your profile and enable location.",
//       data: [],
//       onboardingRequired: true
//     };
//   }

//   // 2️⃣ REDIS CACHE CHECK (No changes here)
//   if (redis) {
//     try {
//       const cached = await redis.get(CACHE_KEY);
//       if (cached) {
//         const parsed = JSON.parse(cached);
//         return { success: true, count: parsed.data?.length || 0, cached: true, data: parsed.data };
//       }
//     } catch (err) { console.error("❌ Redis error:", err); }
//   }

//   // 3️⃣ PARALLEL DATA FETCH (Exclusion Lists)
//   const [swipes, matches, blocked, superlikes, blockedPhoneHashes] = await Promise.all([
//     Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
//     Match.find({ users: userId }).distinct("users"),
//     userActionsModel.find({
//       $or: [{ actorId: userId, actionType: { $in: ["block", "report"] } }, { targetId: userId, actionType: "block" }]
//     }).distinct("targetId"),
//     Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId"),
//     BlockedContact.find({ userId }).distinct("blockedPhoneHash")
//   ]);

//   let blockedUserIdsByPhone = [];
//   if (blockedPhoneHashes.length) {
//     const users = await User.find({ phoneHash: { $in: blockedPhoneHashes } }).distinct("_id");
//     blockedUserIdsByPhone = users.map(id => id.toString());
//   }

//   const superlikeSet = new Set(superlikes.map(id => id.toString()));
//   const excludeIds = [...new Set([
//     ...swipes.map(id => id.toString()),
//     ...matches.map(id => id.toString()),
//     ...blocked.map(id => id.toString()),
//     ...blockedUserIdsByPhone,
//     userId.toString()
//   ])].filter(id => !superlikeSet.has(id));

//   // 4️⃣ DYNAMIC QUERY BUILDING (Merging New Discovery Model)
//   const discovery = myProfile.discovery || {};
//   const query = { 
//     userId: { $nin: excludeIds }, 
//     isDiscoverable: true,
//     isMandatoryComplete: true // Sirf verified log dikhao
//   };
  
//   // Gender Filter (Naye model ka showMeGender array)
//   if (discovery.showMeGender?.length) {
//     query.gender = { $in: discovery.showMeGender };
//   }
  
//   // Age Range Filter
//   if (discovery.ageRange) {
//     const now = new Date();
//     query.dob = {
//       $gte: new Date(now.getFullYear() - (discovery.ageRange.max || 35), 0, 1),
//       $lte: new Date(now.getFullYear() - (discovery.ageRange.min || 18), 11, 31)
//     };
//   }

//   // "Has a Bio" Hard Filter (Agar user ne setting on ki hai)
//   if (discovery.hasBio) {
//     query.about = { $exists: true, $ne: "" };
//   }

//   // Geospatial Search (Distance)
//   if (myProfile.location?.coordinates) {
//     query.location = {
//       $near: {
//         $geometry: { type: "Point", coordinates: myProfile.location.coordinates },
//         $maxDistance: (discovery.distanceRange || 50) * 1000
//       }
//     };
//   }

//   // 5️⃣ DB FETCH
//   const profiles = await Profile.find(query)
//     .limit(limit * 3) // Scoring ke liye zyada samples uthate hain
//     .select("userId nickname about photos location dob gender attributes discovery createdAt")
//     .lean();

//   // 6️⃣ BOOST & ADVANCED SCORING ENGINE
//   let boostedResults = [];
//   if (redis && profiles.length) {
//     try {
//       const boostPromises = profiles.map(p => redis.get(`boost:${p.userId.toString()}`));
//       boostedResults = await Promise.all(boostPromises);
//     } catch (e) { boostedResults = []; }
//   }

//   // Scoring Setup
//   const myPrefs = discovery.advancedFilters || {};
//   const myInterests = new Set(discovery.preferredInterests || []);
//   const now = new Date();

//   const transformedProfiles = profiles.map((profile, index) => {
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     const isBoosted = !!boostedResults[index];
//     const targetAttr = profile.attributes || {};
    
//     // --- SCORING LOGIC (Hindi: Yahan scoring handle ho rahi hai) ---
//     let score = isSuperliked ? 2000 : 0; // Superlike priority
//     if (isBoosted) score += 500; // Boost priority

//     // 1. Interest Match (Weight: 20 per match)
//     const commonInterests = (targetAttr.interests || []).filter(i => myInterests.has(i));
//     score += commonInterests.length * 20;

//     // 2. Goal Match (Weight: 30) - Same intent
//     if (profile.discovery?.relationshipGoal === discovery.relationshipGoal) score += 30;

//     // 3. Advanced Traits Match (Figma Chips) - Weight: 10 each
//     // Smoking, Drinking, Zodiac match hone par score badhega
//     const traitsToMatch = ['smoking', 'drinking', 'zodiac', 'pets', 'workout'];
//     traitsToMatch.forEach(trait => {
//         if (myPrefs[trait] && targetAttr[trait] === myPrefs[trait]) {
//             score += 10;
//         }
//     });

//     // Distance-based bonus (Pass hone par score badhega)
//     const distanceKm = calculateDistance(
//         myProfile.location.coordinates[1], myProfile.location.coordinates[0], 
//         profile.location.coordinates[1], profile.location.coordinates[0]
//     );
//     score += Math.max(0, 50 - distanceKm); // Jitna pas, utna score (+0 to +50)

//     // Age calculation
//     let age = 0;
//     if (profile.dob) {
//         const birthDate = new Date(profile.dob);
//         age = now.getFullYear() - birthDate.getFullYear();
//         if (now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) age--;
//     }

//     return {
//       id: profile.userId,
//       displayName: `${profile.nickname}, ${age}`,
//       nickname: profile.nickname,
//       age: age,
//       bio: profile.about || "", // Naye model mein 'about' field hai
//       images: (profile.photos || []).sort((a,b) => a.order - b.order).map(p => p.url),
//       interests: targetAttr.interests || [],
//       distanceText: distanceKm <= 1 ? "1 km away" : `${Math.round(distanceKm)} km away`,
//       isSuperKeen: isSuperliked,
//       isBoosted: isBoosted,
//       commonInterests: commonInterests,
//       matchScore: score, // UI par scoring dikhane ke liye
//       compatibilityLabel: score > 100 ? "High Compatibility" : "Good Match",
//       createdAt: profile.createdAt
//     };
//   });

//   // Score ke basis par sort karo taaki best matches top par aayein
//   transformedProfiles.sort((a, b) => b.matchScore - a.matchScore);
//   const finalResult = transformedProfiles.slice(0, limit);

//   // 7️⃣ CACHE FINAL FEED
//   if (redis && finalResult.length) {
//     await redis.set(CACHE_KEY, JSON.stringify({ data: finalResult }), 'EX', CACHE_TTL);
//   }

//   return { success: true, count: finalResult.length, cached: false, data: finalResult };
// }






async function doSwipe(swiperId, targetId, action) {
  if (swiperId.toString() === targetId.toString()) {
    throw new Error("Cannot swipe on your own profile");
  }

  const session = await mongoose.startSession();
  let result = { success: true, match: false, message: "Swipe processed" };

  try {
    await session.withTransaction(async () => {
      // 1. Check for Target Profile & Mutual Block (Using New Model)
      const [targetProfile, blockExists] = await Promise.all([
        Profile.findOne({ userId: targetId }).session(session),
        Block.findOne({
          $or: [
            { blockerId: swiperId, blockedId: targetId }, // Maine use block kiya hai
            { blockerId: targetId, blockedId: swiperId }  // Usne mujhe block kiya hai
          ]
        }).session(session)
      ]);

      if (!targetProfile) {
        throw new Error('Target profile not found');
      }

      if (blockExists) {
        throw new Error("Action not allowed. User interaction is blocked.");
      }

      // 2. Check for existing swipe (Avoid duplicates)
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
             const CACHE_KEY = `feed:${swiperId.toString()}`;
             await redis.del(CACHE_KEY);
             console.log("Redis cache cleared for new filters");
         }

      // 5. Check for mutual like/match
      if (['like', 'superlike'].includes(action)) {
        const mutualSwipe = await Swipe.findOne({
          swiperId: targetId, 
          targetId: swiperId, 
          action: { $in: ['like', 'superlike'] }
        }).session(session);

        if (mutualSwipe) {
          // Mutual Interest Found! Create a Match
          const [match] = await Match.create([{
            users: [swiperId, targetId], 
            status: 'matched', 
            lastActivity: new Date()
          }], { session });

          // Invalidate cache again if it's a match (to update match lists)
          if (global.redis) {
            await Promise.all([
              redis.del(`matches:${swiperId}`),
              redis.del(`matches:${targetId}`)
            ]);
          }

          result = { 
            success: true, 
            match: true, 
            matchId: match._id, 
            message: "It's a match!",
            partnerData: { // Frontend ke liye extra details agar match popup dikhana ho
                name: targetProfile.nickname,
                image: targetProfile.photos?.[0]?.url
            }
          };
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


// async function doSwipe(swiperId, targetId, action) {
//   if (swiperId.toString() === targetId.toString()) {
//     throw new Error("Cannot swipe on your own profile");
//   }

//   const session = await mongoose.startSession();
//   let result = { success: true, match: false, message: "Swipe processed" };

//   try {
//     await session.withTransaction(async () => {
//       // 1. Check for existing block
//       const targetProfile = await Profile.findOne({ userId: targetId }).session(session);
//       if (!targetProfile) {
//         throw new Error('Target profile not found');
//       }
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
//         swiperId,
//         targetId
//       }).session(session);

//       if (existingSwipe) {
//         result = { success: true, already: true, message: "Already swiped", match: false };
//         return;
//       }

//       // 3. Create new swipe
//       await Swipe.create([{ swiperId, targetId, action, createdAt: new Date() }], { session });

//       if (redis) {
//         await Promise.all([
//           redis.del(`feed:${swiperId}`),
//           redis.del(`feed:${targetId}`)
//         ]);
//       }

//       // 4. Check for mutual like
//       if (['like', 'superlike'].includes(action)) {
//         const mutualSwipe = await Swipe.findOne({
//           swiperId: targetId, targetId: swiperId, action: { $in: ['like', 'superlike'] }
//         }).session(session);

//         if (mutualSwipe) {
//           // Create match
//           const [match] = await Match.create([{
//             users: [swiperId, targetId], status: 'matched', lastActivity: new Date()
//           }], { session });

//           if (redis) {
//             await Promise.all([
//               redis.del(`feed:${swiperId}`),
//               redis.del(`feed:${targetId}`)
//             ]);
//           }

//           // Update Redis if needed
//           // if (redis) {
//           //   const queueKey1 = `${SWIPE_QUEUE_PREFIX}${swiperId}`;
//           //   const queueKey2 = `${SWIPE_QUEUE_PREFIX}${targetId}`;

//           //   await Promise.all([
//           //     redis.lRem(queueKey1, 0, targetId.toString()),
//           //     redis.lRem(queueKey2, 0, swiperId.toString())
//           //   ]);
//           // }

//           result = { success: true, match: true, matchId: match._id, message: "It's a match!" };
//           return;
//         }
//       }

//       result = { success: true, match: false, message: "Swipe recorded" };
//     });

//     return result;

//   } catch (error) {
//     console.error('Swipe error:', error);
//     throw error;
//   } finally {
//     await session.endSession();
//   }
// }
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

// function calculateAge(dob) {
//   const birthDate = new Date(dob);
//   const today = new Date();
//   let age = today.getFullYear() - birthDate.getFullYear();
//   const m = today.getMonth() - birthDate.getMonth();
//   if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
//     age--;
//   }
//   return age;
// }



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





// async function getFeedService(userId, limit = 20) {

//   const CACHE_KEY = `feed:${userId.toString()}`;

//   const CACHE_TTL = 300;



//   // 1️⃣ Profile Fetch (Sirf ek baar declare kiya hai)

//   const myProfile = await Profile.findOne({ userId }).lean();

//   if (!myProfile) throw new Error("Profile not found");



//   // 🚨 GATEKEEPER CHECK: Incomplete user ko feed nahi dikhani

//   if (!myProfile.isDiscoverable || !myProfile.location?.coordinates ||

//       (myProfile.location.coordinates[0] === 0 && myProfile.location.coordinates[1] === 0)) {

//     return {

//       success: false,

//       message: "Please complete your profile and enable location to see matches.",

//       data: [],

//       onboardingRequired: true

//     };

//   }



//   // 2️⃣ REDIS CACHE CHECK

//   if (redis) {

//     try {

//       const cached = await redis.get(CACHE_KEY);

//       if (cached) {

//         console.log("✅ FEED FROM REDIS");

//         const parsed = JSON.parse(cached);

//         return { success: true, count: parsed.data?.length || 0, cached: true, data: parsed.data };

//       }

//     } catch (err) { console.error("❌ Redis GET error:", err); }

//   }



//   // 3️⃣ PARALLEL DATA FETCH (Swipes, Matches, etc.)

//   const [swipes, matches, blocked, superlikes, blockedPhoneHashes] = await Promise.all([

//     Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),

//     Match.find({ users: userId }).distinct("users"),

//     userActionsModel.find({

//       $or: [{ actorId: userId, actionType: { $in: ["block", "report"] } }, { targetId: userId, actionType: "block" }]

//     }).distinct("targetId"),

//     Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId"),

//     BlockedContact.find({ userId }).distinct("blockedPhoneHash")

//   ]);



//   let blockedUserIdsByPhone = [];

//   if (blockedPhoneHashes.length) {

//     const users = await User.find({ phoneHash: { $in: blockedPhoneHashes } }).distinct("_id");

//     blockedUserIdsByPhone = users.map(id => id.toString());

//   }



//   const superlikeSet = new Set(superlikes.map(id => id.toString()));

//   const excludeIds = [...new Set([

//     ...swipes.map(id => id.toString()),

//     ...matches.map(id => id.toString()),

//     ...blocked.map(id => id.toString()),

//     ...blockedUserIdsByPhone,

//     userId.toString()

//   ])].filter(id => !superlikeSet.has(id));



//   // 4️⃣ QUERY BUILDING

//   const prefs = myProfile.preferences || {};

//   const query = { userId: { $nin: excludeIds }, isDiscoverable: true };

 

//   if (prefs.genderPreference?.length) query.gender = { $in: prefs.genderPreference };

 

//   if (prefs.ageRange) {

//     const now = new Date();

//     query.dob = {

//       $gte: new Date(now.getFullYear() - (prefs.ageRange.max || 50), 0, 1),

//       $lte: new Date(now.getFullYear() - (prefs.ageRange.min || 18), 11, 31)

//     };

//   }



//   if (myProfile.location?.coordinates) {

//     query.location = {

//       $near: {

//         $geometry: { type: "Point", coordinates: myProfile.location.coordinates },

//         $maxDistance: (prefs.distanceRange || 50) * 1000

//       }

//     };

//   }



//   // 5️⃣ DB FETCH

//   const profiles = await Profile.find(query)

//     .limit(limit * 2)

//     .select("userId nickname bio photos location dob gender interests createdAt")

//     .lean();



//   // 6️⃣ BOOST & SCORING

//   let boostedResults = [];

//   if (redis && profiles.length) {

//     try {

//       const boostPromises = profiles.map(p => redis.get(`boost:${p.userId.toString()}`));

//       boostedResults = await Promise.all(boostPromises);

//     } catch (e) { boostedResults = []; }

//   }



//   const interestSet = new Set(myProfile.discoveryFilters?.interests || myProfile.interests || []);

//   const now = new Date();



//   const transformedProfiles = profiles.map((profile, index) => {

//     const isSuperliked = superlikeSet.has(profile.userId.toString());

//     const isBoosted = !!boostedResults[index];

   

//     // Scoring logic

//     let score = isSuperliked ? 1000 : 0;

//     if (isBoosted) score += 200;

//     if (interestSet.size && profile.interests?.length) {

//       score += (profile.interests.filter(i => interestSet.has(i)).length) * 10;

//     }



//     // Age calculation

//     let age = 0;

//     if (profile.dob) {

//         const birthDate = new Date(profile.dob);

//         age = now.getFullYear() - birthDate.getFullYear();

//         if (now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) age--;

//     }



//     // ✅ EXACT DISTANCE CALCULATION

//     let distanceText = "Near you";

//     if (myProfile.location?.coordinates && profile.location?.coordinates) {

//         const km = calculateDistance(

//           myProfile.location.coordinates[1], myProfile.location.coordinates[0],

//           profile.location.coordinates[1], profile.location.coordinates[0]

//         );

//         distanceText = km <= 1 ? "1 km away" : `${km} km away`;

//     }



//     const common = profile.interests.filter(i => interestSet.has(i));

//     return {

//       id: profile.userId,

//       displayName: age > 0 ? `${profile.nickname}, ${age}` : profile.nickname,

//       nickname: profile.nickname,

//       age: age,

//       bio: profile.bio || "",

//       images: (profile.photos || []).sort((a,b) => a.order - b.order).map(p => p.url),

//       interests: profile.interests || [],

//       distanceText: distanceText,

//       isSuperKeen: isSuperliked,

//       isBoosted: isBoosted,

//       intentMessage: isSuperliked ? "They chose you with intent!" : null,

//       commonInterests: common, // Array of common interest names

//   hasCommonInterests: common.length > 0,

//       _matchScore: score,

//       createdAt: profile.createdAt

//     };

//   });



//   transformedProfiles.sort((a, b) => b._matchScore - a._matchScore);

//   const finalResult = transformedProfiles.slice(0, limit);



//   if (redis && finalResult.length) {

//     await redis.set(CACHE_KEY, { data: finalResult }, { EX: CACHE_TTL });

//   }



//   return { success: true, count: finalResult.length, cached: false, data: finalResult };

// }

// module.exports = { getFeedService };

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








