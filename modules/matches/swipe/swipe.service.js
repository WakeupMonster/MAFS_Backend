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
const { checkUserQuota } = require("../../../common/utils/quotaHelper")
const UserSubscription = require("../../auth/UserSubscription.model")
const { canUserAccessFeed } = require("../../../common/utils/profileAccess");
const { addNotificationJob } = require('../../../queues/notification.queue');

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


async function getFeedService(userId, limit, page) {
  const CACHE_KEY = `feed:${userId.toString()}`;
  const SEEN_KEY = `feed:seen:${userId.toString()}`;
  const CACHE_TTL = 30;
  const SEEN_TTL = 60 * 60 * 24;
  const skip = (page - 1) * limit;

  let sub = await UserSubscription.findOne({ userId });
  if (!sub) sub = await UserSubscription.create({ userId });

  sub.resetIfNeeded();

  const myProfile = await Profile.findOne({ userId }).lean();
  if (!myProfile) throw new Error("Profile not found");

  const canAccess = canUserAccessFeed({ profile: myProfile });
  if (!canAccess || !myProfile.location?.coordinates) {
    return {
      success: false,
      message: "Profile not eligible for discovery",
      data: [],
      onboardingRequired: true
    };
  }

  let seenProfiles = [];
  if (redis) {
    try {
      const seenCached = await redis.get(SEEN_KEY);
      if (seenCached) seenProfiles = JSON.parse(seenCached);
    } catch (e) {
      console.error("Seen Redis Parse Error", e);
      seenProfiles = [];
    }
  }

  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        console.log("Feed from redis");
        return {
          success: true,
          count: JSON.parse(cached).data?.length,
          cached: true,
          data: JSON.parse(cached).data
        };
      }
    } catch (err) {
      console.error("Redis Error:", err);
    }
  }

  const [
    swipes, matches, myBlocked, blockedMe,
    myReports, superlikes, nonActiveUsers
  ] = await Promise.all([
    Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
    Match.find({ users: userId }).distinct("users"),
    Block.find({ blockerId: userId }).distinct("blockedId"),
    Block.find({ blockedId: userId }).distinct("blockerId"),
    Report.find({ reporterId: userId }).distinct("reportedId"),
    Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId"),
    User.find({ accountStatus: { $ne: "active" } }).distinct("_id")
  ]);

  const blockedPhoneHashes = await BlockedContact.find({ userId }).distinct("blockedPhoneHash");
  let blockedByContactUserIds = [];

  if (blockedPhoneHashes.length) {
    const users = await User.find({ phoneHash: { $in: blockedPhoneHashes } }).distinct("_id");
    blockedByContactUserIds = users.map(id => id.toString());
  }

  const superlikeSet = new Set(superlikes.map(id => id.toString()));

  const excludeIds = [
    ...new Set([
      ...swipes, ...matches, ...myBlocked, ...blockedMe,
      ...myReports, ...blockedByContactUserIds,
      ...seenProfiles, ...nonActiveUsers, userId
    ])
  ].map(id => id.toString());

  const discovery = myProfile.discovery || {};
  const query = {
    userId: { $nin: excludeIds },
    isMandatoryComplete: true,
    "discovery.globalVisibility": "everyone"
  };

  if (discovery.showMeGender?.length) query.gender = { $in: discovery.showMeGender };


  if (discovery.ageRange) {
    const now = new Date();
    query.dob = {
      $gte: new Date(now.getFullYear() - (discovery.ageRange.max || 50), 0, 1),
      $lte: new Date(now.getFullYear() - (discovery.ageRange.min || 18), 11, 31)
    };
  }

  if (discovery.hasBio) query.about = { $exists: true, $ne: "" };

  if (myProfile.location?.coordinates) {
    query.location = {
      $near: {
        $geometry: { type: "Point", coordinates: myProfile.location.coordinates },
        $maxDistance: (discovery.distanceRange || 50) * 1000
      }
    };
  }

  const profiles = await Profile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (redis && profiles.length === 0 && seenProfiles.length) {
    await redis.del(SEEN_KEY);
    const retryExcludeIds = excludeIds.filter(id => !seenProfiles.includes(id));
    query.userId = { $nin: retryExcludeIds };
  }

  const boostKeys = profiles.map(p => `boost:${p.userId.toString()}`);
  const boostResults = await redis.mGet(boostKeys);

  // ═══════════════════════════════════════════════════════
  // ✅ FIX 1: Properly extract MY filters/preferences
  // ═══════════════════════════════════════════════════════
  const myInterests = myProfile.attributes?.interests || myProfile.interests || [];
  const myPreferredInterests = discovery.preferredInterests || [];

  console.log("pref inte",myPreferredInterests)

  const PreferredInterests = discovery.preferredInterests || [];

  console.log("pref int new",PreferredInterests)

  const myAdvancedFilters = discovery.advancedFilters || {};
  const myAttributes = myProfile.attributes || {};
  const activeSearchGoal = discovery.filterRelationshipGoal 
    || discovery.relationshipGoal 
    || myProfile.relationshipGoal;

  // ✅ FIX 2: Combine both my interests AND preferred interests for matching
  const myAllInterests = [...new Set([...myInterests, ...myPreferredInterests])];

  const transformedProfiles = profiles.map((profile, index) => {
    const targetAttr = profile.attributes || {};
    // const targetInterests = targetAttr.interests || profile.interests || [];
    const targetInterests = profile.discovery.preferredInterests || [];
    const isSuperliked = superlikeSet.has(profile.userId.toString());
    const isBoosted = boostResults?.[index] === "1";

    let compatibilityScore = 0;  // 0-100 scale for FILTER matching
    let priorityScore = 0;       // Separate score for sorting order

    if (isSuperliked) priorityScore += 1000;
    if (isBoosted) priorityScore += 500;

  
    const commonWithPreferred = targetInterests.filter(
      i => myPreferredInterests.includes(i)
    );
    const commonWithOwn = targetInterests.filter(
      i => myInterests.includes(i)
    );
    const allCommon = [...new Set([...commonWithPreferred, ...commonWithOwn])];

    // Preferred interests get MORE weight
    compatibilityScore += commonWithPreferred.length * 8;  // Higher weight
    // Own interests get normal weight
    compatibilityScore += commonWithOwn.filter(
      i => !commonWithPreferred.includes(i)
    ).length * 5;

    // ═══════════════════════════════════════════════════════
    // ✅ FIX 5: Relationship Goal matching - higher weight
    // ═══════════════════════════════════════════════════════
    const targetGoal = profile.discovery?.relationshipGoal 
      || profile.relationshipGoal;
    
    if (activeSearchGoal && targetGoal) {
      if (targetGoal === activeSearchGoal) {
        compatibilityScore += 20;  // Exact match
      }
    }

    // ═══════════════════════════════════════════════════════
    // ✅ FIX 6: Advanced Filters - each trait properly weighted
    // ═══════════════════════════════════════════════════════
    const matchedTraits = [];
    const traitWeights = {
      smoking: 8,
      drinking: 8,
      zodiac: 5,
      pets: 6,
      workout: 7,
      diet: 5,
      education: 6,
      religion: 7,
      languages: 5
    };

    Object.keys(traitWeights).forEach(trait => {
      const myFilterValue = myAdvancedFilters[trait];
      const targetValue = targetAttr[trait];

      if (myFilterValue && targetValue) {
        if (Array.isArray(myFilterValue)) {
          // If filter is array (e.g., languages), check overlap
          if (Array.isArray(targetValue)) {
            const overlap = targetValue.filter(v => myFilterValue.includes(v));
            if (overlap.length > 0) {
              compatibilityScore += traitWeights[trait];
              matchedTraits.push(trait);
            }
          } else if (myFilterValue.includes(targetValue)) {
            compatibilityScore += traitWeights[trait];
            matchedTraits.push(trait);
          }
        } else {
          // Direct comparison
          if (targetValue === myFilterValue) {
            compatibilityScore += traitWeights[trait];
            matchedTraits.push(trait);
          }
        }
      }
    });

    // ═══════════════════════════════════════════════════════
    // ✅ FIX 7: Distance-based scoring
    // ═══════════════════════════════════════════════════════
    let distanceKm = 0;
    if (myProfile.location?.coordinates && profile.location?.coordinates) {
      distanceKm = calculateDistance(
        myProfile.location.coordinates[1],
        myProfile.location.coordinates[0],
        profile.location.coordinates[1],
        profile.location.coordinates[0]
      );
    }

    // Closer = higher score
    if (distanceKm <= 5) compatibilityScore += 15;
    else if (distanceKm <= 15) compatibilityScore += 10;
    else if (distanceKm <= 30) compatibilityScore += 5;
    else if (distanceKm <= 50) compatibilityScore += 2;

    // ═══════════════════════════════════════════════════════
    // ✅ FIX 8: Profile completeness bonus
    // ═══════════════════════════════════════════════════════
    if (profile.verification?.status === "approved") compatibilityScore += 5;
    if (profile.about && profile.about.length > 20) compatibilityScore += 3;
    if (profile.photos && profile.photos.length >= 3) compatibilityScore += 2;

    // ═══════════════════════════════════════════════════════
    // ✅ FIX 9: Cap at 100, ensure minimum 1
    // ═══════════════════════════════════════════════════════
    const finalMatchScore = Math.min(Math.max(compatibilityScore, 1), 100);

    // ═══════════════════════════════════════════════════════
    // ✅ FIX 10: Better compatibility labels based on actual score
    // ═══════════════════════════════════════════════════════
    let compatibilityLabel;
    if (finalMatchScore >= 80) compatibilityLabel = "Excellent Match 💯";
    else if (finalMatchScore >= 60) compatibilityLabel = "Great Match 🔥";
    else if (finalMatchScore >= 40) compatibilityLabel = "Good Match 👍";
    else if (finalMatchScore >= 20) compatibilityLabel = "Worth Exploring 🌟";
    else compatibilityLabel = "New Discovery ✨";

    // Dynamic highlights
    const dynamicHighlights = [];

    if (allCommon.length > 0) {
      dynamicHighlights.push({
        type: "INTEREST_MATCH",
        icon: "🔥",
        title: "Common Vibe",
        description: allCommon.length > 1
          ? `You both love ${allCommon[0]} +${allCommon.length - 1} more`
          : `You both love ${allCommon[0]}`
      });
    }

    if (targetGoal && targetGoal === activeSearchGoal) {
      dynamicHighlights.push({
        type: "GOAL_MATCH",
        icon: "🎯",
        title: "Same Intent",
        description: `Both looking for ${targetGoal}`
      });
    }

    if (matchedTraits.length > 0) {
      dynamicHighlights.push({
        type: "TRAIT_MATCH",
        icon: "✅",
        title: "Lifestyle Match",
        description: matchedTraits.length > 1
          ? `Matches on ${matchedTraits[0]} +${matchedTraits.length - 1} more`
          : `Matches on ${matchedTraits[0]} habits`
      });
    }

    dynamicHighlights.push({
      type: "LOCATION",
      icon: "📍",
      title: "Nearby",
      description: distanceKm <= 1 ? "In your neighborhood" : `${distanceKm} km away`
    });

    if (profile.verification?.status === "approved") {
      dynamicHighlights.push({
        type: "VERIFIED",
        icon: "🛡️",
        title: "Verified",
        description: "Authenticity checked by MAFS"
      });
    }

    if (dynamicHighlights.length < 6) {
      if (profile.about && profile.about.length > 20) {
        dynamicHighlights.push({
          type: "BIO_PREVIEW",
          icon: "✍️",
          title: "About Me",
          description: profile.about.substring(0, 40) + "..."
        });
      }
      dynamicHighlights.push({
        type: "ACTIVITY",
        icon: "⚡",
        title: "Active Now",
        description: "This user is looking for a match!"
      });
      if (profile.photos?.length > 3) {
        dynamicHighlights.push({
          type: "PHOTO_QUALITY",
          icon: "📸",
          title: "Photo Gallery",
          description: "Check out more moments"
        });
      }
    }

    return {
      userId: profile.userId,
      profile: {
        nickname: profile.nickname || "User",
        age: calculateAge(profile.dob),
        bio: profile.about || null,
        city: profile.location?.city || null,
        distanceText: distanceKm <= 1 ? "1 km away" : `${distanceKm} km away`,
        isVerified: profile.verification?.status === "approved"
      },
      images: (profile.photos || [])
        .sort((a, b) => a.order - b.order)
        .map(p => ({ url: p.url })),
      relationshipGoal: targetGoal || "Not specified",
      attributes: targetAttr,
      discoveryFilters: {
        interest: profile.discovery?.preferredInterests || [],
      },
      context: {
        matchScore: finalMatchScore,
        compatibilityLabel,
        isSuperLikeSender: isSuperliked,
        isBoosted: !!isBoosted,
        commonInterests: allCommon,
        // ✅ NEW: Score breakdown for debugging
        scoreBreakdown: {
          interestScore: commonWithPreferred.length * 8 + 
            commonWithOwn.filter(i => !commonWithPreferred.includes(i)).length * 5,
          goalScore: (targetGoal === activeSearchGoal && activeSearchGoal) ? 20 : 0,
          traitScore: matchedTraits.length * 
            (matchedTraits.reduce((sum, t) => sum + (traitWeights[t] || 5), 0) / 
            Math.max(matchedTraits.length, 1)),
          distanceScore: distanceKm <= 5 ? 15 : distanceKm <= 15 ? 10 : 
            distanceKm <= 30 ? 5 : distanceKm <= 50 ? 2 : 0,
          profileBonus: (profile.verification?.status === "approved" ? 5 : 0) + 
            (profile.about?.length > 20 ? 3 : 0) + 
            (profile.photos?.length >= 3 ? 2 : 0),
          totalRaw: compatibilityScore
        }
      },
      dynamicHighlights: dynamicHighlights.slice(0, 6)
    };
  });

  // ✅ FIX 11: Sort using PRIORITY score (superlike/boost) + matchScore
  transformedProfiles.sort((a, b) => {
    // SuperLike always top
    if (a.context.isSuperLikeSender && !b.context.isSuperLikeSender) return -1;
    if (!a.context.isSuperLikeSender && b.context.isSuperLikeSender) return 1;

    // Boosted comes next
    if (a.context.isBoosted && !b.context.isBoosted) return -1;
    if (!a.context.isBoosted && b.context.isBoosted) return 1;

    // Then match score (which now ACTUALLY reflects filter matching)
    return b.context.matchScore - a.context.matchScore;
  });

  const finalResult = transformedProfiles.slice(0, limit);

  if (redis && finalResult.length) {
    const newSeen = [
      ...new Set([
        ...seenProfiles,
        ...finalResult.map(p => p.userId.toString())
      ])
    ];
    await redis.set(SEEN_KEY, newSeen, { EX: SEEN_TTL });
    await redis.set(CACHE_KEY, { data: finalResult }, { EX: CACHE_TTL });
  }

  return { success: true, count: finalResult.length, data: finalResult };
}










// async function getFeedService(userId, limit, page) {
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const SEEN_KEY = `feed:seen:${userId.toString()}`;
//   const CACHE_TTL = 30;
//   const SEEN_TTL = 60 * 60 * 24; // 24 hours
//   const skip = (page - 1) * limit;

//   let sub = await UserSubscription.findOne({ userId });
//   if (!sub) sub = await UserSubscription.create({ userId });

//   sub.resetIfNeeded();

//   const myProfile = await Profile.findOne({ userId }).lean();
//   if (!myProfile) throw new Error("Profile not found");

//   const canAccess = canUserAccessFeed({ profile: myProfile });
//   if (!canAccess || !myProfile.location?.coordinates) {
//     return {
//       success: false,
//       message: "Profile not eligible for discovery",
//       data: [],
//       onboardingRequired: true
//     };
//   }

//   // 🔹 SEEN PROFILES FETCH (NEW)
//   let seenProfiles = [];
//   if (redis) {
//     try {
//       const seenCached = await redis.get(SEEN_KEY);
//       if (seenCached) seenProfiles = JSON.parse(seenCached);
//     } catch (e) {
//       console.error("Seen Redis Parse Error", e);
//       seenProfiles = [];
//     }
//   }

//   if (redis) {
//     try {
//       const cached = await redis.get(CACHE_KEY);
//       if (cached) {
//         console.log("Feed from redis");
//         return {
//           success: true,
//           count: JSON.parse(cached).data?.length,
//           cached: true,
//           data: JSON.parse(cached).data
//         };
//       }
//     } catch (err) {
//       console.error("Redis Error:", err);
//     }
//   }

//   const [
//     swipes,
//     matches,
//     myBlocked,
//     blockedMe,
//     myReports,
//     superlikes,
//      nonActiveUsers 
//   ] = await Promise.all([
//     Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
//     Match.find({ users: userId }).distinct("users"),
//     Block.find({ blockerId: userId }).distinct("blockedId"),
//     Block.find({ blockedId: userId }).distinct("blockerId"),
//     Report.find({ reporterId: userId }).distinct("reportedId"),
//     Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId"),
//       User.find({ accountStatus: { $ne: "active" } }).distinct("_id") 
//   ]);

//   const blockedPhoneHashes = await BlockedContact.find({ userId }).distinct("blockedPhoneHash");
//   let blockedByContactUserIds = [];

//   if (blockedPhoneHashes.length) {
//     const users = await User.find({ phoneHash: { $in: blockedPhoneHashes } }).distinct("_id");
//     blockedByContactUserIds = users.map(id => id.toString());
//   }

//   const superlikeSet = new Set(superlikes.map(id => id.toString()));

//   // 🔹 MERGE SEEN INTO EXCLUDE (NEW)
//   const excludeIds = [
//     ...new Set([
//       ...swipes,
//       ...matches,
//       ...myBlocked,
//       ...blockedMe,
//       ...myReports,
//       ...blockedByContactUserIds,
//       ...seenProfiles,
//       ...nonActiveUsers,
//       userId
//     ])
//   ].map(id => id.toString());

//   const discovery = myProfile.discovery || {};
//   const query = {
//     userId: { $nin: excludeIds },
//     isMandatoryComplete: true,
//     "discovery.globalVisibility": "everyone"
//   };

//   if (discovery.showMeGender?.length) query.gender = { $in: discovery.showMeGender };

//   if (discovery.ageRange) {
//     const now = new Date();
//     query.dob = {
//       $gte: new Date(now.getFullYear() - (discovery.ageRange.max || 50), 0, 1),
//       $lte: new Date(now.getFullYear() - (discovery.ageRange.min || 18), 11, 31)
//     };
//   }

//   if (discovery.hasBio) query.about = { $exists: true, $ne: "" };

//   if (myProfile.location?.coordinates) {
//     query.location = {
//       $near: {
//         $geometry: { type: "Point", coordinates: myProfile.location.coordinates },
//         $maxDistance: (discovery.distanceRange || 50) * 1000
//       }
//     };

//   }
//     const profiles = await Profile.find(query)
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(limit)
//     .lean();

//   if (redis && profiles.length === 0 && seenProfiles.length) {
//   await redis.del(SEEN_KEY);

//   // refetch without seenProfiles
//   const retryExcludeIds = excludeIds.filter(
//     id => !seenProfiles.includes(id)
//   );

//   query.userId = { $nin: retryExcludeIds };


//   }
// //     if (profiles.length < limit) {
// //   await redis.del(SEEN_KEY); // reset seen early
// // }


//   const boostKeys = profiles.map(p => `boost:${p.userId.toString()}`);
//   const boostResults = await redis.mGet(boostKeys);

//   const myPreferredInterests = discovery.preferredInterests || [];
//   const myAdvancedFilters = discovery.advancedFilters || {};
//   const activeSearchGoal = discovery.filterRelationshipGoal || discovery.relationshipGoal;

//   const transformedProfiles = profiles.map((profile, index) => {
//     const targetAttr = profile.attributes || {};
//     const targetInterests = targetAttr.interests || profile.interests || [];
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     const isBoosted = boostResults?.[index] === "1";

//     let score = isSuperliked ? 1000 : 0;
//     if (isBoosted) score += 500;

//     const common = targetInterests.filter(i => myPreferredInterests.includes(i));
//     score += common.length * 25;

//     const targetGoal = profile.discovery?.relationshipGoal;
//     if (targetGoal === activeSearchGoal) score += 40;

//     const matchedTraits = [];
//     ['smoking', 'drinking', 'zodiac', 'pets', 'workout'].forEach(trait => {
//       if (myAdvancedFilters[trait] && targetAttr[trait] === myAdvancedFilters[trait]) {
//         score += 15;
//         matchedTraits.push(targetAttr[trait]);
//       }
//     });

//     let distanceKm = 0;
//     if (myProfile.location?.coordinates && profile.location?.coordinates) {
//       distanceKm = calculateDistance(
//         myProfile.location.coordinates[1],
//         myProfile.location.coordinates[0],
//         profile.location.coordinates[1],
//         profile.location.coordinates[0]
//       );
//     }

//     const dynamicHighlights = [];

//     if (common.length > 0) {
//       dynamicHighlights.push({ type: "INTEREST_MATCH", icon: "🔥", title: "Common Vibe", description: `You both love ${common[0]}` });
//     }
//     if (targetGoal === activeSearchGoal) {
//       dynamicHighlights.push({ type: "GOAL_MATCH", icon: "🎯", title: "Same Intent", description: `Both looking for ${targetGoal}` });
//     }
//     if (matchedTraits.length > 0) {
//       dynamicHighlights.push({ type: "TRAIT_MATCH", icon: "✅", title: "Lifestyle", description: `Matches on ${matchedTraits[0]} habits` });
//     }

//     dynamicHighlights.push({
//       type: "LOCATION",
//       icon: "📍",
//       title: "Nearby",
//       description: distanceKm <= 1 ? "In your neighborhood" : `${distanceKm} km away`
//     });

//     if (profile.verification?.status === "approved") {
//       dynamicHighlights.push({ type: "VERIFIED", icon: "🛡️", title: "Verified", description: "Authenticity checked by MAFS" });
//     }

//     if (dynamicHighlights.length < 6) {
//       if (profile.about && profile.about.length > 20) {
//         dynamicHighlights.push({ type: "BIO_PREVIEW", icon: "✍️", title: "About Me", description: profile.about.substring(0, 40) + "..." });
//       }
//       dynamicHighlights.push({ type: "ACTIVITY", icon: "⚡", title: "Active Now", description: "This user is looking for a match!" });
//       if (profile.photos.length > 3) {
//         dynamicHighlights.push({ type: "PHOTO_QUALITY", icon: "📸", title: "Photo Gallery", description: "Check out more moments" });
//       }
//     }

//     return {
//       userId: profile.userId,
//       profile: {
//         nickname: profile.nickname || "User",
//         age: calculateAge(profile.dob),
//         bio: profile.about || null,
//         city: profile.location?.city || null,
//         distanceText: distanceKm <= 1 ? "1 km away" : `${distanceKm} km away`,
//         isVerified: profile.verification?.status === "approved"
//       },
//       images: (profile.photos || []).sort((a, b) => a.order - b.order).map(p => ({ url: p.url })),
//       relationshipGoal: targetGoal || "Not specified",
//       attributes: targetAttr,
//       discoveryFilters : {
//         interest : profile.discovery?.preferredInterests || [],
//         relationshipGoal : profile.discovery?.filterRelationshipGoal || null,
//       },
//       context: {
//         matchScore: Math.min(score, 100),
//         compatibilityLabel: score > 75 ? "Excellent Match" : score > 40 ? "Great Match" : "Good Match",
//         isSuperLikeSender: isSuperliked,
//         isBoosted: !!isBoosted,
//         commonInterests: common
//       },
//       dynamicHighlights: dynamicHighlights.slice(0, 6)
//     };
//   });

//   // transformedProfiles.sort((a, b) => {
//   //   if (a.context.isBoosted && !b.context.isBoosted) return -1;
//   //   if (!a.context.isBoosted && b.context.isBoosted) return 1;
//   //   return b.context.matchScore - a.context.matchScore;
//   // });

//   transformedProfiles.sort((a, b) => {
//   // 1️ SuperLike always top
//   if (a.context.isSuperLikeSender && !b.context.isSuperLikeSender) return -1;
//   if (!a.context.isSuperLikeSender && b.context.isSuperLikeSender) return 1;

//   // 2️ Boosted comes next
//   if (a.context.isBoosted && !b.context.isBoosted) return -1;
//   if (!a.context.isBoosted && b.context.isBoosted) return 1;

//   // 3️ Then match score
//   return b.context.matchScore - a.context.matchScore;
// });

//   const finalResult = transformedProfiles.slice(0, limit);

//   // 🔹 UPDATE SEEN PROFILES (NEW)
//   if (redis && finalResult.length) {
//     const newSeen = [
//       ...new Set([
//         ...seenProfiles,
//         ...finalResult.map(p => p.userId.toString())
//       ])
//     ];
//     await redis.set(SEEN_KEY, newSeen, { EX: SEEN_TTL });
//     await redis.set(CACHE_KEY, { data: finalResult }, { EX: CACHE_TTL });
//   }

//   return { success: true, count: finalResult.length, data: finalResult };
// }


// async function getFeedService(userId,limit ,page) {
//   const CACHE_KEY = `feed:${userId.toString()}`;
//   const CACHE_TTL = 30;
//   const skip = (page - 1) * limit;

//   let sub = await UserSubscription.findOne({ userId });
//   if (!sub) sub = await UserSubscription.create({ userId });

//   // 2. Reset daily counters if needed
//   sub.resetIfNeeded();

//   // 1️⃣ User Profile & Filters Fetch
//   const myProfile = await Profile.findOne({ userId }).lean();
//   if (!myProfile) throw new Error("Profile not found");
//   const canAccess = canUserAccessFeed({ profile: myProfile });

//   if (!canAccess || !myProfile.location?.coordinates) {
//     return {
//       success: false,
//       message: "Profile not eligible for discovery",
//       data: [],
//       onboardingRequired: true
//     };
//   }
//   if (redis) {
//     try {
//       const cached = await redis.get(CACHE_KEY);
//       if (cached)
//         console.log("Feed from redis")
//       return { success: true, count: JSON.parse(cached).data?.length, cached: true, data: JSON.parse(cached).data };
//     } catch (err) { console.error("Redis Error:", err); }
//   }

//   // 3️⃣ Exclusion Lists (Swipes, Blocks, etc.)
//   const [swipes,          // 1. Maine kise like/pass kiya
//     matches,         // 2. Mere matches
//     myBlocked,       // 3. Maine kise block kiya
//     blockedMe,       // 4. Mujhe kisne block kiya
//     myReports,       // 5. Maine kise report kiya
//     superlikes] = await Promise.all([
//       Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
//       Match.find({ users: userId }).distinct("users"),
//       // userActionsModel.find({ $or: [{ actorId: userId }, { targetId: userId }] }).distinct("targetId"),
//       Block.find({ blockerId: userId }).distinct("blockedId"),
//       // Jinhone mujhe block kiya
//       Block.find({ blockedId: userId }).distinct("blockerId"),
//       // Maine jinhe report kiya (unhe bhi feed se hata dena chahiye)
//       Report.find({ reporterId: userId }).distinct("reportedId"),
//       Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId")
//     ]);


//   const blockedPhoneHashes = await BlockedContact.find({
//     userId
//   }).distinct("blockedPhoneHash");

//   let blockedByContactUserIds = [];

//   if (blockedPhoneHashes.length) {
//     const users = await User.find({
//       phoneHash: { $in: blockedPhoneHashes }
//     }).distinct("_id");

//     blockedByContactUserIds = users.map(id => id.toString());
//   }

// console.log("swipes",swipes)
//   const superlikeSet = new Set(superlikes.map(id => id.toString()));
//   console.log(superlikeSet, "superlikeSet")
//   const excludeIds = [...new Set([...swipes,
//   ...matches,
//   ...myBlocked,
//   ...blockedMe,
//   ...myReports, ...blockedByContactUserIds, userId])].map(id => id.toString());

//   const discovery = myProfile.discovery || {};
//   const query = { userId: { $nin: excludeIds }, isMandatoryComplete: true, "discovery.globalVisibility": "everyone" };

//   if (discovery.showMeGender?.length) query.gender = { $in: discovery.showMeGender };
//   if (discovery.ageRange) {
//     const now = new Date();
//     query.dob = {
//       $gte: new Date(now.getFullYear() - (discovery.ageRange.max || 50), 0, 1),
//       $lte: new Date(now.getFullYear() - (discovery.ageRange.min || 18), 11, 31)
//     };
//   }

//   if (discovery.hasBio) {
//     query.about = { $exists: true, $ne: "" };
//   }

//   // Location Radius
//   if (myProfile.location?.coordinates) {
//     query.location = {
//       $near: {
//         $geometry: { type: "Point", coordinates: myProfile.location.coordinates },
//         $maxDistance: (discovery.distanceRange || 50) * 1000
//       }
//     };
//   }

//   // const profiles = await Profile.find(query).limit(50).lean();
//     const profiles = await Profile.find(query)
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(limit)
//     .lean();
//   const boostKeys = profiles.map(p => `boost:${p.userId.toString()}`);

// const boostResults = await redis.mGet(boostKeys);

// console.log("boostresult",boostResults)

//   const myPreferredInterests = discovery.preferredInterests || [];
//   const myAdvancedFilters = discovery.advancedFilters || {};
//   const activeSearchGoal = discovery.filterRelationshipGoal || discovery.relationshipGoal;
//   const transformedProfiles = profiles.map((profile,index) => {
//     const targetAttr = profile.attributes || {};
//     const targetInterests = targetAttr.interests || profile.interests || [];
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     console.log(
//   "BOOST CHECK →",
//   profile.userId.toString(),
//   boostResults?.[index]
// );




//     const isBoosted = boostResults?.[index] === "1";

//     // console.log(isSuperliked, "has in set")
//     // 1️⃣ Match Score Calculation (Score Logic Same Rakhenge)
//     let score = isSuperliked ? 1000 : 0;
//     if (isBoosted) {
//         score += 500; 
//     }
//     const common = targetInterests.filter(i => myPreferredInterests.includes(i));

//     score += (common.length * 25);

//     const targetGoal = profile.discovery?.relationshipGoal;
//     if (targetGoal === activeSearchGoal) score += 40;

//     const matchedTraits = [];
//     // Advanced Traits Match (+15 points each)
//     const traits = ['smoking', 'drinking', 'zodiac', 'pets', 'workout'];
//     traits.forEach(trait => {
//       if (myAdvancedFilters[trait] && targetAttr[trait] === myAdvancedFilters[trait]) {
//         score += 15;
//         matchedTraits.push(targetAttr[trait]);
//       }
//     });


//     // 2️⃣ Distance calculation
//     let distanceKm = 0;
//     if (myProfile.location?.coordinates && profile.location?.coordinates) {
//       distanceKm = calculateDistance(
//         myProfile.location.coordinates[1], myProfile.location.coordinates[0],
//         profile.location.coordinates[1], profile.location.coordinates[0]
//       );
//     }

//     // 3️⃣ Frontend "Hand-holding" logic (Card Highlights)
//     // Ye array frontend ko batayega ki pehle card par kya dikhana hai aur dusre par kya
//     const cardHighlights = [];
//     if (common.length > 0) cardHighlights.push(`You both love ${common[0]}`);
//     if (targetGoal) cardHighlights.push(`Looking for: ${targetGoal}`);
//     if (distanceKm <= 5) cardHighlights.push(`Very close to you!`);
//     if (score > 75) cardHighlights.push(`${score}% Compatible`);


//     const dynamicHighlights = [];

//     // --- 1. Priority Matches (Real Data) ---
//     if (common.length > 0) {
//       dynamicHighlights.push({ type: "INTEREST_MATCH", icon: "🔥", title: "Common Vibe", description: `You both love ${common[0]}` });
//     }
//     if (targetGoal === activeSearchGoal) {
//       dynamicHighlights.push({ type: "GOAL_MATCH", icon: "🎯", title: "Same Intent", description: `Both looking for ${targetGoal}` });
//     }
//     if (matchedTraits.length > 0) {
//       dynamicHighlights.push({ type: "TRAIT_MATCH", icon: "✅", title: "Lifestyle", description: `Matches on ${matchedTraits[0]} habits` });
//     }

//     // --- 2. Essential Info (Hamesha hoti hai) ---
//     dynamicHighlights.push({ type: "LOCATION", icon: "📍", title: "Nearby", description: distanceKm <= 1 ? "In your neighborhood" : `${distanceKm} km away` });

//     if (profile.verification?.status === "approved") {
//       dynamicHighlights.push({ type: "VERIFIED", icon: "🛡️", title: "Verified", description: "Authenticity checked by MAFS" });
//     }

//     // --- 3. Fallbacks (Jab 6 cards pure karne ho) ---
//     if (dynamicHighlights.length < 6) {
//       // Fallback: Bio Card
//       if (profile.about && profile.about.length > 20) {
//         dynamicHighlights.push({ type: "BIO_PREVIEW", icon: "✍️", title: "About Me", description: profile.about.substring(0, 40) + "..." });
//       }

//       // Fallback: Freshness Card
//       dynamicHighlights.push({ type: "ACTIVITY", icon: "⚡", title: "Active Now", description: "This user is looking for a match!" });

//       // Fallback: Quality Card
//       if (profile.photos.length > 3) {
//         dynamicHighlights.push({ type: "PHOTO_QUALITY", icon: "📸", title: "Photo Gallery", description: "Check out more moments" });
//       }


//     }
//     return {
//       userId: profile.userId,
//       profile: {
//         nickname: profile.nickname || "User",
//         age: calculateAge(profile.dob),
//         bio: profile.about || null,
//         city: profile.location?.city || null,
//         distanceText: distanceKm <= 1 ? "1 km away" : `${distanceKm} km away`,
//         isVerified: profile.verification?.status === "approved"
//       },

//       // --- 2. IMAGES (Formatted as Objects) ---
//       images: (profile.photos || [])
//         .sort((a, b) => a.order - b.order)
//         .map(p => ({ url: p.url })),

//       // --- 3. GOALS ---
//       relationshipGoal: targetGoal || "Not specified",


//       attributes: {
//         interests: targetAttr.interests || null,
//         zodiac: targetAttr.zodiac || null,
//         education: targetAttr.education || null,
//         vaccineStatus: targetAttr.vaccineStatus || null,
//         familyPlans: targetAttr.familyPlans || null,
//         personalityType: targetAttr.personalityType || null,
//         communicationStyle: targetAttr.communicationStyle || null,
//         loveStyle: targetAttr.loveStyle || null,
//         bloodType: targetAttr.bloodType || null,
//         pets: targetAttr.pets || null,
//         drinking: targetAttr.drinking || null,
//         smoking: targetAttr.smoking || null,
//         workout: targetAttr.workout || null,
//         dietary: targetAttr.dietary || null,
//         socialMedia: targetAttr.socialMedia || null,
//         sleeping: targetAttr.sleeping || null
//       },

//       // --- 5. CONTEXT (Match Details) ---
//       context: {
//         matchScore: Math.min(score, 100),
//         compatibilityLabel: score > 75 ? "Excellent Match" : (score > 40 ? "Great Match" : "Good Match"),
//         isSuperLikeSender: isSuperliked, // Blue border logic for UI
//         isBoosted: !!isBoosted,
//         commonInterests: common
//       },

//       // --- 6. DYNAMIC HIGHLIGHTS (UI Cards) ---
//       dynamicHighlights: dynamicHighlights.slice(0, 6)
//     };
//   });
//   // transformedProfiles.sort((a, b) => b.context.matchScore - a.context.matchScore);
//   transformedProfiles.sort((a, b) => {
//   // 1️ Boosted always first
//   if (a.context.isBoosted && !b.context.isBoosted) return -1;
//   if (!a.context.isBoosted && b.context.isBoosted) return 1;

//   // 2️ Then by matchScore
//   return b.context.matchScore - a.context.matchScore;
// });
// // transformedProfiles.sort((a, b) => {
// //   // 1️ SuperLike always top
// //   if (a.context.isSuperLikeSender && !b.context.isSuperLikeSender) return -1;
// //   if (!a.context.isSuperLikeSender && b.context.isSuperLikeSender) return 1;

// //   // 2️ Boosted comes next
// //   if (a.context.isBoosted && !b.context.isBoosted) return -1;
// //   if (!a.context.isBoosted && b.context.isBoosted) return 1;

// //   // 3️ Then match score
// //   return b.context.matchScore - a.context.matchScore;
// // });

//   const finalResult = transformedProfiles.slice(0, limit,page);
//   if (redis && finalResult.length) {
//     // await redis.set(CACHE_KEY, JSON.stringify({ data: finalResult }), 'EX', CACHE_TTL);
//     await redis.set(
//       CACHE_KEY,
//       { data: finalResult },
//       { EX: CACHE_TTL }
//     );
//   }
//   return { success: true,count: finalResult.length, data: finalResult };
// }
function calculateAge(dob) {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000); // Years in ms
}

async function doSwipe(swiperId, targetId, action) {
  // 1. Initial Self-Swipe Check
  if (swiperId.toString() === targetId.toString()) {
    throw new Error("Cannot swipe on your own profile");
  }

  const session = await mongoose.startSession();

  try {
    let result = { success: true, match: false, message: "Swipe processed" };

    // Sab kuch ek hi transaction block mein
    await session.withTransaction(async () => {

      // 2. Fetch Subscription (Session ke saath)
      let sub = await UserSubscription.findOne({ userId: swiperId }).session(session);
      if (!sub) {
        [sub] = await UserSubscription.create([{ userId: swiperId }], { session });
      }

      // 3. Reset daily counters if it's a new day
      sub.resetIfNeeded();

      // 4. GATEKEEPER CHECK
      const quota = checkUserQuota(sub, action);
      if (!quota.allowed) {
        const now = new Date();
        const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Return structured error for Frontend
        result = {
          success: false,
          error: "LIMIT_REACHED",
          message: action === 'like' ? "Daily likes limit reached!" : "No Superlikes left for today!",
          data: {
            quotaStatus: {
              used: action === 'like' ? sub.dailyLikesUsed : sub.dailySuperlikesUsed,
              limit: quota.total,
              remaining: 0,
              resetAt: tonight
            },
            upsell: {
              title: "Don't stop swiping!",
              description: "Upgrade now to get unlimited likes and more superlikes.",
              action: "SHOW_PREMIUM_MODAL"
            }
          }
        };
        // Yahan se bahar nikal jao (Transaction abort nahi hogi, bas update nahi hoga)
        return;
      }

      // 5. Target Profile aur Block Check
      const [targetProfile, blockExists] = await Promise.all([
        Profile.findOne({ userId: targetId }).session(session),
        Block.findOne({
          $or: [
            { blockerId: swiperId, blockedId: targetId },
            { blockerId: targetId, blockedId: swiperId }
          ]
        }).session(session)
      ]);

      if (!targetProfile) throw new Error('Target profile not found');
      if (blockExists) throw new Error("Action not allowed. User interaction is blocked.");

      // 6. Avoid Duplicates
      const existingSwipe = await Swipe.findOne({ swiperId, targetId }).session(session);
      if (existingSwipe) {
        result = { success: true, already: true, message: "Already swiped", match: false };
        return;
      }

      // 7. 🔥 UPDATE COUNTER & SAVE (Ye line DB update karegi)
      if (action === 'like') {
        sub.dailyLikesUsed += 1;
      } else if (action === 'superlike') {
        sub.dailySuperlikesUsed += 1;
      }
      await sub.save({ session }); // Ab ye save hoga because of clean session

      // 8. Create Swipe Record
      await Swipe.create([{ swiperId, targetId, action, createdAt: new Date() }], { session });

      // 9. Match Logic
      let mutualSwipe = null;
      if (['like', 'superlike'].includes(action)) {
        const mutualSwipe = await Swipe.findOne({
          swiperId: targetId,
          targetId: swiperId,
          action: { $in: ['like', 'superlike'] }
        }).session(session);

        if (mutualSwipe) {
          const [match] = await Match.create([{
            users: [swiperId, targetId],
            status: 'matched',
            lastActivity: new Date()
          }], { session });

          const myProfile = await Profile.findOne({ userId: swiperId }).session(session);

          result = {
            success: true,
            message: "It's a match!",
            data: {
              isMatch: true,
              matchDetails: {
                matchId: match._id,
                chatId: match._id, // Room ID for socket/chat
                user: {
                  userId: targetId,
                  nickname: targetProfile.nickname,
                  photoUrl: targetProfile.photos?.[0]?.url || null
                },
                myPhotoUrl: myProfile?.photos?.[0]?.url || null
              },
              // 🔥 Wallet Section (Calculated from updated 'sub')
              wallet: {
                likesRemaining: Math.max(0, 30 - sub.dailyLikesUsed),
                superLikesRemaining: Math.max(0, 3 - sub.dailySuperlikesUsed) + (sub.superlikeBalance || 0),
                rewindsRemaining: sub.planId !== 'free' ? 999 : 0
              }
            }
          };
          addNotificationJob('NEW_MATCH', { userId1: swiperId, userId2: targetId });
        } else {
          // 🔥 CASE 2: NO MATCH (Manager's exact request)
          // Ye response dikhega jab user swipe karega par samne wale ne abhi like nahi kiya
          result = {
            success: true,
            data: {
              isMatch: false,
              matchDetails: null,
              wallet: {
                likesRemaining: Math.max(0, 30 - sub.dailyLikesUsed),
                superLikesRemaining: Math.max(0, 3 - sub.dailySuperlikesUsed) + (sub.superlikeBalance || 0),
                rewindsRemaining: sub.planId !== 'free' ? 5 : 0
              }

            }

          }
          if (action === 'like' || action === 'superlike') {
            addNotificationJob('NEW_LIKE', { senderId: swiperId, receiverId: targetId });
          }

          // result = { 
          //   success: true, 
          //   match: true, 
          //   matchId: match._id, 
          //   message: "It's a match!",
          //   partnerData: { 
          //       name: targetProfile.nickname,
          //       image: targetProfile.photos?.[0]?.url
          //   }
          // };
        }
      }

      // 10. Cache Clearing (Transaction ke andar ya bahar)
      if (redis) {
        await redis.del(`feed:${swiperId.toString()}`);
        if (result.match) {
          await Promise.all([
            redis.del(`matches:${swiperId}`),
            redis.del(`matches:${targetId}`)
          ]);
        }
      }
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

module.exports = {
  getFeedService,
  doSwipe,
  undoSwipe,
}
