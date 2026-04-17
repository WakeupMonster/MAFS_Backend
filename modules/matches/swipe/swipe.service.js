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
const { canUserAccessFeed } = require("../../../common/utils/profileAccess");
const { addNotificationJob } = require("../../../queues/notification.queue");
const { NOTIFICATION_TYPES } = require("../../notifications/notification.enums");
const UsageService = require("../../subscription/services/usage.service");
const Subscription = require("../../subscription/models/Subscription");
const adminEvents = require("../../../events/admin.events");

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

async function getFeedService(userId, limit, page) {
  const CACHE_KEY = `feed:${userId.toString()}`;
  const SEEN_KEY = `feed:seen:${userId.toString()}`;
  const CACHE_TTL = 3;
  const SEEN_TTL = 60 * 60 * 24;
  const skip = (page - 1) * limit;

  // 1. Setup Subscription and Profile
  let [sub, myProfile] = await Promise.all([
    Subscription.findOne({
      userId,
      status: "ACTIVE",
      expiresAt: { $gt: new Date() },
    }).lean(),
    Profile.findOne({ userId }).lean(),
  ]);

  const isPremium = !!sub;
  if (!myProfile) throw new Error("Profile not found");

  const discovery = myProfile.discovery || {};
  // Feed is open to ALL users (even non-KYC). They can browse but cannot perform actions.
  // Only KYC-approved profiles will appear in the feed (enforced via queryFilters below).
  // If user has no location, $near filter is simply skipped (line 154 handles this).

  // 2. Fetch Seen Profiles from Redis (to avoid repeats in session)
  let seenProfiles = [];
  if (redis) {
    try {
      const seenCached = await redis.get(SEEN_KEY);
      if (seenCached) seenProfiles = JSON.parse(seenCached);
    } catch (e) {
      console.error("Redis Get Error (SeenProfiles):", e);
    }
  }

  // 3. Return from Cache if available (only page 1 — other pages always fresh)
  if (redis && page === 1) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          success: true,
          count: parsed.data?.length,
          cached: true,
          data: parsed.data,
        };
      }
    } catch (err) {
      console.error("Redis Get Error (Cache):", err);
    }
  }

  // 4. Gather Exclusion IDs (Always Excluded)
  // Cache nonActiveUsers globally — avoids full User table scan on every request
  let nonActiveUserIds = [];
  const NON_ACTIVE_KEY = "global:nonActiveUsers";
  if (redis) {
    try {
      const cachedNA = await redis.get(NON_ACTIVE_KEY);
      if (cachedNA) {
        nonActiveUserIds = JSON.parse(cachedNA);
      } else {
        nonActiveUserIds = (
          await User.find({ accountStatus: { $ne: "active" } }).distinct("_id")
        ).map((id) => id.toString());
        await redis.set(NON_ACTIVE_KEY, nonActiveUserIds, { EX: 300 });
      }
    } catch (e) {
      console.error("NonActiveUsers cache error:", e);
      nonActiveUserIds = (
        await User.find({ accountStatus: { $ne: "active" } }).distinct("_id")
      ).map((id) => id.toString());
    }
  } else {
    nonActiveUserIds = (
      await User.find({ accountStatus: { $ne: "active" } }).distinct("_id")
    ).map((id) => id.toString());
  }

  const [swipes, matches, myBlocked, blockedMe, myReports, receivedSuperlikes] =
    await Promise.all([
      Swipe.find({
        swiperId: userId,
        action: { $in: ["like", "pass", "superlike"] },
      }).distinct("targetId"),
      Match.find({ users: userId }).distinct("users"),
      Block.find({ blockerId: userId }).distinct("blockedId"),
      Block.find({ blockedId: userId }).distinct("blockerId"),
      Report.find({ reporterId: userId }).distinct("reportedId"),
      Swipe.find({ targetId: userId, action: "superlike" }).distinct(
        "swiperId",
      ),
    ]);

  const blockedPhoneHashes = await BlockedContact.find({ userId }).distinct(
    "blockedPhoneHash",
  );
  let blockedByContactUserIds = [];
  if (blockedPhoneHashes.length) {
    const users = await User.find({
      phoneHash: { $in: blockedPhoneHashes },
    }).distinct("_id");
    blockedByContactUserIds = users.map((id) => id.toString());
  }

  // Use Set for O(1) lookups instead of Array.includes O(n)
  const baseExcludeSet = new Set([
    ...swipes.map((id) => id.toString()),
    ...matches.map((id) => id.toString()),
    ...myBlocked.map((id) => id.toString()),
    ...blockedMe.map((id) => id.toString()),
    ...myReports.map((id) => id.toString()),
    ...blockedByContactUserIds,
    ...nonActiveUserIds,
    userId.toString(),
  ]);

  const excludeIds =
    page === 1
      ? [...new Set([...baseExcludeSet, ...seenProfiles])]
      : [...baseExcludeSet];

  // 5. Build Final Query Filters
  const queryFilters = {
    userId: { $nin: excludeIds },
    isMandatoryComplete: true,
    "verification.status": "approved",
    "discovery.globalVisibility": "everyone",
  };

  // "everyone" means show ALL genders — skip gender filter in that case
  if (
    discovery.showMeGender?.length &&
    !discovery.showMeGender.includes("everyone")
  ) {
    queryFilters.gender = { $in: discovery.showMeGender };
  }
  if (discovery.ageRange) {
    const now = new Date();
    queryFilters.dob = {
      $gte: new Date(now.getFullYear() - (discovery.ageRange.max || 50), 0, 1),
      $lte: new Date(
        now.getFullYear() - (discovery.ageRange.min || 18),
        11,
        31,
      ),
    };
  }
  if (discovery.hasBio) queryFilters.about = { $exists: true, $ne: "" };
  if (myProfile.location?.coordinates) {
    queryFilters.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: myProfile.location.coordinates,
        },
        $maxDistance: (discovery.distanceRange || 50) * 1000,
      },
    };
  }

  // 6. Execute Query
  async function runQuery(q) {
    let pq = Profile.find(q);
    // Prioritize superlikers at the DB level by sorting them first if not using $near
    // If using $near, we have to handle prioritization manually after fetching or use an aggregation
    if (!q.location) pq = pq.sort({ createdAt: -1 });

    return pq.skip(skip).limit(limit).lean();
  }

  // Fetch Superlikers on ALL pages — they must always be at the top until user swipes
  let profiles = [];
  {
    const superlikersToFetch = receivedSuperlikes.filter(
      (id) => !baseExcludeSet.has(id.toString()),
    );
    if (superlikersToFetch.length > 0) {
      // Apply same discovery filters to superlikers for consistency
      const superlikerQuery = {
        userId: { $in: superlikersToFetch },
        isMandatoryComplete: true,
        "verification.status": "approved",
        "discovery.globalVisibility": "everyone",
      };
      // "everyone" means all genders — skip filter
      if (
        discovery.showMeGender?.length &&
        !discovery.showMeGender.includes("everyone")
      ) {
        superlikerQuery.gender = { $in: discovery.showMeGender };
      }
      if (queryFilters.dob) superlikerQuery.dob = queryFilters.dob;

      const maxSuperlikers = Math.min(5, limit);
      const superlikerProfiles = await Profile.find(superlikerQuery)
        .limit(maxSuperlikers)
        .lean();
      profiles = [...superlikerProfiles];
    }
  }

  // // Fetch Boosted Profiles to ensure they are at the top alongside superlikes
  if (limit - profiles.length > 0) {
    try {
      if (redis && redis.redisClient && typeof redis.redisClient.keys === 'function') {
        const keys = await redis.redisClient.keys('boost:*');
        if (keys && keys.length > 0) {
          // Exclude already seen superlikes and base exclusions
          const currentExcludeSet = new Set([...baseExcludeSet, ...profiles.map(p => p.userId.toString())]);
          const boostedUserIds = keys.map(k => k.split(':')[1]).filter(id => !currentExcludeSet.has(id.toString()));

          if (boostedUserIds.length > 0) {
            const boostQuery = {
              userId: { $in: boostedUserIds },
              isMandatoryComplete: true,
              "discovery.globalVisibility": "everyone"
            };
            if (discovery.showMeGender?.length && !discovery.showMeGender.includes("everyone")) {
              boostQuery.gender = { $in: discovery.showMeGender };
            }
            if (queryFilters.dob) boostQuery.dob = queryFilters.dob;

            // Limit to max 5 boosted profiles per page so it doesn't flood the limit
            const maxBoosted = Math.min(5, limit - profiles.length);
            const boostedProfiles = await Profile.find(boostQuery).limit(maxBoosted).lean();
            profiles = [...profiles, ...boostedProfiles];
          }
        }
      }
    } catch (err) {
      console.error("Error explicitly fetching boosted profiles:", err);
    }
  }

  // Fetch remaining profiles
  const remainingLimit = limit - profiles.length;
  let additionalProfiles = [];
  if (remainingLimit > 0) {
    const currentExclude = [
      ...new Set([...excludeIds, ...profiles.map((p) => p.userId.toString())]),
    ];
    queryFilters.userId = { $nin: currentExclude };
    additionalProfiles = await runQuery(queryFilters);
    profiles = [...profiles, ...additionalProfiles];
  }

  // 7. HANDLE EXHAUSTION (RETRY)
  // Check if normal db pool exhausted (ignoring explicitly fetched superlikes)
  if (additionalProfiles.length === 0 && seenProfiles.length > 0 && page === 1) {
    console.log(
      `Pool exhausted for ${userId}. Resetting seenProfiles and retrying immediately...`,
    );
    if (redis) await redis.del(SEEN_KEY);
    seenProfiles = [];

    // Make sure we still exclude any superlikers/boosted users we just grabbed above!
    const excludeForRetry = [...new Set([...baseExcludeSet, ...profiles.map(p => p.userId.toString())])];
    queryFilters.userId = { $nin: excludeForRetry };
    const retryProfiles = await runQuery(queryFilters);
    profiles = [...profiles, ...retryProfiles];
  }

  if (profiles.length === 0) {
    return {
      success: true,
      count: 0,
      data: [],
      message: "No more profiles found",
    };
  }

  // 8. Transformation & Scoring
  const boostKeys = profiles.map((p) => `boost:${p.userId.toString()}`);
  const boostResults =
    redis && profiles.length ? await redis.mGet(boostKeys) : [];
  const superlikeSet = new Set(receivedSuperlikes.map((id) => id.toString()));

  const myInterests =
    myProfile.attributes?.interests || myProfile.interests || [];
  const myPreferredInterests = discovery.preferredInterests || [];
  const myAdvancedFilters = discovery.advancedFilters || {};
  const activeSearchGoal =
    discovery.filterRelationshipGoal ||
    discovery.relationshipGoal ||
    myProfile.relationshipGoal;

  const transformedProfiles = profiles.map((profile, index) => {
    const targetAttr = profile.attributes || {};
    const targetInterests = profile.discovery?.preferredInterests || [];
    const isSuperliked = superlikeSet.has(profile.userId.toString());
    const isBoosted = boostResults?.[index] === "1";

    let compatibilityScore = 0;
    let priorityScore = 0;

    if (isSuperliked) priorityScore += 1000;
    if (isBoosted) priorityScore += 500;

    const commonWithPreferred = targetInterests.filter((i) =>
      myPreferredInterests.includes(i),
    );
    const commonWithOwn = targetInterests.filter((i) =>
      myInterests.includes(i),
    );
    const allCommon = [...new Set([...commonWithPreferred, ...commonWithOwn])];

    compatibilityScore += commonWithPreferred.length * 8;
    compatibilityScore +=
      commonWithOwn.filter((i) => !commonWithPreferred.includes(i)).length * 5;

    const targetGoal =
      profile.discovery?.relationshipGoal || profile.relationshipGoal;
    if (activeSearchGoal && targetGoal && targetGoal === activeSearchGoal) {
      compatibilityScore += 20;
    }

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
      languages: 5,
    };

    Object.keys(traitWeights).forEach((trait) => {
      const myFilterValue = myAdvancedFilters[trait];
      const targetValue = targetAttr[trait];
      if (myFilterValue && targetValue) {
        if (Array.isArray(myFilterValue)) {
          if (Array.isArray(targetValue)) {
            if (targetValue.some((v) => myFilterValue.includes(v))) {
              compatibilityScore += traitWeights[trait];
              matchedTraits.push(trait);
            }
          } else if (myFilterValue.includes(targetValue)) {
            compatibilityScore += traitWeights[trait];
            matchedTraits.push(trait);
          }
        } else if (targetValue === myFilterValue) {
          compatibilityScore += traitWeights[trait];
          matchedTraits.push(trait);
        }
      }
    });

    let distanceKm = 0;
    if (myProfile.location?.coordinates && profile.location?.coordinates) {
      distanceKm = calculateDistance(
        myProfile.location.coordinates[1],
        myProfile.location.coordinates[0],
        profile.location.coordinates[1],
        profile.location.coordinates[0],
      );
    }

    if (distanceKm <= 5) compatibilityScore += 15;
    else if (distanceKm <= 15) compatibilityScore += 10;
    else if (distanceKm <= 30) compatibilityScore += 5;
    else if (distanceKm <= 50) compatibilityScore += 2;

    const finalMatchScore = Math.min(Math.max(compatibilityScore, 1), 100);

    let compatibilityLabel;
    if (finalMatchScore >= 80) compatibilityLabel = "Excellent Match 💯";
    else if (finalMatchScore >= 60) compatibilityLabel = "Great Match 🔥";
    else if (finalMatchScore >= 40) compatibilityLabel = "Good Match 👍";
    else if (finalMatchScore >= 20) compatibilityLabel = "Worth Exploring 🌟";
    else compatibilityLabel = "New Discovery ✨";

    const dynamicHighlights = [];
    if (allCommon.length > 0) {
      dynamicHighlights.push({
        type: "INTEREST_MATCH",
        icon: "🔥",
        title: "Common Vibe",
        description:
          allCommon.length > 1
            ? `You both love ${allCommon[0]} +${allCommon.length - 1} more`
            : `You both love ${allCommon[0]}`,
      });
    }

    if (targetGoal && targetGoal === activeSearchGoal) {
      dynamicHighlights.push({
        type: "GOAL_MATCH",
        icon: "🎯",
        title: "Same Intent",
        description: `Both looking for ${targetGoal}`,
      });
    }

    if (matchedTraits.length > 0) {
      dynamicHighlights.push({
        type: "TRAIT_MATCH",
        icon: "✅",
        title: "Lifestyle Match",
        description:
          matchedTraits.length > 1
            ? `Matches on ${matchedTraits[0]} +${matchedTraits.length - 1} more`
            : `Matches on ${matchedTraits[0]} habits`,
      });
    }

    dynamicHighlights.push({
      type: "LOCATION",
      icon: "📍",
      title: "Nearby",
      description:
        distanceKm <= 1 ? "In your neighborhood" : `${distanceKm} km away`,
    });

    if (profile.verification?.status === "approved") {
      dynamicHighlights.push({
        type: "VERIFIED",
        icon: "🛡️",
        title: "Verified",
        description: "Authenticity checked by MAFS",
      });
    }

    if (dynamicHighlights.length < 6) {
      if (profile.about && profile.about.length > 20) {
        dynamicHighlights.push({
          type: "BIO_PREVIEW",
          icon: "✍️",
          title: "About Me",
          description: profile.about.substring(0, 40) + "...",
        });
      }
      dynamicHighlights.push({
        type: "ACTIVITY",
        icon: "⚡",
        title: "Active Now",
        description: "This user is looking for a match!",
      });
    }

    return {
      userId: profile.userId,
      profile: {
        nickname: profile.nickname || "User",
        age: calculateAge(profile.dob),
        bio: profile.about || null,
        city: profile.location?.city || null,
        distanceText: distanceKm <= 1 ? "1 km away" : `${distanceKm} km away`,
        isVerified: profile.verification?.status === "approved",
      },
      images: (profile.photos || [])
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ url: p.url })),
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
      },
      dynamicHighlights: dynamicHighlights.slice(0, 6),
    };
  });

  // PRIORITY SORTING
  transformedProfiles.sort((a, b) => {
    if (a.context.isSuperLikeSender && !b.context.isSuperLikeSender) return -1;
    if (!a.context.isSuperLikeSender && b.context.isSuperLikeSender) return 1;
    if (a.context.isBoosted && !b.context.isBoosted) return -1;
    if (!a.context.isBoosted && b.context.isBoosted) return 1;
    return b.context.matchScore - a.context.matchScore;
  });

  const finalResult = transformedProfiles.slice(0, limit);

  // 9. Update Cache and Seen List
  if (redis && finalResult.length) {
    const MAX_SEEN = 500; // Cap to prevent $nin from becoming too large
    let newSeen = [
      ...new Set([
        ...seenProfiles,
        ...finalResult.map((p) => p.userId.toString()),
      ]),
    ];
    if (newSeen.length > MAX_SEEN) {
      newSeen = newSeen.slice(-MAX_SEEN); // Keep most recent
    }
    await redis.set(SEEN_KEY, newSeen, { EX: SEEN_TTL });
    // Only cache page 1 results (other pages are always fresh)
    if (page === 1) {
      await redis.set(CACHE_KEY, { data: finalResult }, { EX: CACHE_TTL });
    }
  }

  // const status = await UsageService.getUsageStatus(userId);

  return {
    success: true,
    count: finalResult.length,
    data: finalResult,
    // userQuota: status.data
  };
}
function calculateAge(dob) {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000); // Years in ms
}

async function doSwipe(swiperId, targetId, action) {
  // 1. Initial Checks
  if (swiperId.toString() === targetId.toString()) {
    throw new Error("Cannot swipe on your own profile");
  }

  if (
    !mongoose.Types.ObjectId.isValid(targetId) ||
    !/^[0-9a-fA-F]{24}$/.test(targetId.toString())
  ) {
    throw new Error(
      "Invalid target user ID format. ID must be a 24-character hex string.",
    );
  }

  const session = await mongoose.startSession();

  try {
    let result = { success: true, match: false, message: "Swipe processed" };

    // Sab kuch ek hi transaction block mein
    await session.withTransaction(async () => {
      // 2. Determine Usage Type
      const usageType = action === "superlike" ? "SUPER_KEEN" : "LIKE";

      // 3. Target Profile aur Block Check
      const [targetProfile, blockExists] = await Promise.all([
        Profile.findOne({ userId: targetId }).session(session),
        Block.findOne({
          $or: [
            { blockerId: swiperId, blockedId: targetId },
            { blockerId: targetId, blockedId: swiperId },
          ],
        }).session(session),
      ]);

      if (!targetProfile) throw new Error("Target profile not found");
      if (blockExists)
        throw new Error("Action not allowed. User interaction is blocked.");

      // 4. Avoid Duplicates
      const existingSwipe = await Swipe.findOne({ swiperId, targetId }).session(
        session,
      );
      if (existingSwipe) {
        result = {
          success: true,
          already: true,
          message: "Already swiped",
          match: false,
        };
        return;
      }

      // 5. GATEKEEPER CHECK (v3)
      let usageResult;
      try {
        if (action !== "pass") {
          // Note: UsageService is not part of the transaction because it needs to persist
          // across failed transactions and manages its own atomic operations.
          usageResult = await UsageService.useItem(swiperId, usageType);
        }
      } catch (error) {
        if (error.message === "LIMIT_REACHED") {
          // Fetch current status for rich error response
          const status = await UsageService.getUsageStatus(swiperId);
          result = {
            success: false,
            // error: "LIMIT_REACHED",
            message:
              action === "like"
                ? "Daily likes limit reached!"
                : "No Super Keens left!",
            data: {
              isPremium: status.data.isPremium,
              showAds: status.data.showAds,
              premiumFeatures: status.data.premiumFeatures,
              allocations: status.data.allocations,
              wallet: status.data.wallet,
              quotaStatus:
                status.data.allocations[
                usageType === "LIKE" ? "likes" : "superKeens"
                ],
              upsell: {
                title: "Don't stop swiping!",
                description:
                  "Upgrade now to get unlimited likes and more super keens.",
                action: "SHOW_PREMIUM_MODAL",
              },
            },
          };
          return; // Exit transaction block gracefully
        }
        throw error; // Other errors
      }

      // 8. Create Swipe Record
      await Swipe.create(
        [{ swiperId, targetId, action, createdAt: new Date() }],
        { session },
      );

      // 9. Match Logic
      let mutualSwipe = null;
      if (["like", "superlike"].includes(action)) {
        mutualSwipe = await Swipe.findOne({
          swiperId: targetId,
          targetId: swiperId,
          action: { $in: ["like", "superlike"] },
        }).session(session);

        if (mutualSwipe) {
          const [match] = await Match.create(
            [
              {
                users: [swiperId, targetId],
                status: "matched",
                lastMessageAt: new Date(), // 🔥 Ensure new matches appear on top
              },
            ],
            { session },
          );

          const myProfile = await Profile.findOne({ userId: swiperId }).session(
            session,
          );
          const status = await UsageService.getUsageStatus(swiperId);

          result = {
            success: true,
            message: "It's a match!",
            data: {
              isMatch: true,
              matchDetails: {
                matchId: match._id,
                chatId: match._id,
                user: {
                  userId: targetId,
                  nickname: targetProfile.nickname,
                  photoUrl: targetProfile.photos?.[0]?.url || null,
                },
                myPhotoUrl: myProfile?.photos?.[0]?.url || null,
              },
              isPremium: status.data.isPremium,
              showAds: status.data.showAds,
              premiumFeatures: status.data.premiumFeatures,
              allocations: status.data.allocations,
              wallet: status.data.wallet,
            },
          };

          // 📢 Fire real-time activity for Admin
          try {
            adminEvents.emit("new_live_activity", {
              id: match._id,
              createdAt: new Date(),
              description: `New Match: ${myProfile?.nickname || "User"} ❤️ ${targetProfile.nickname || "User"}`,
              color: "#4CAF50" // Green for matches
            });
          } catch (err) {
            console.error("Admin match event emit failed", err);
          }
          addNotificationJob(NOTIFICATION_TYPES.NEW_MATCH, {
            userId1: swiperId,
            userId2: targetId,
          });
        } else {
          // 🔥 CASE 2: NO MATCH (Manager's exact request)
          const status = await UsageService.getUsageStatus(swiperId);
          result = {
            success: true,
            message: `Action ${action} successful`,
            data: {
              isMatch: false,
              matchDetails: null,
              isPremium: status.data.isPremium,
              showAds: status.data.showAds,
              premiumFeatures: status.data.premiumFeatures,
              allocations: status.data.allocations,
              wallet: status.data.wallet,
            },
          };
          if (action === "like" || action === "superlike") {
            addNotificationJob(NOTIFICATION_TYPES.NEW_LIKE, {
              senderId: swiperId,
              receiverId: targetId,
            });
          }
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
        await redis.del(`feed:${targetId.toString()}`); // Clear recipient's cache too
        if (result.data?.isMatch) {
          await Promise.all([
            redis.del(`matches:${swiperId}`),
            redis.del(`matches:${targetId}`),
          ]);
        }
      }
    });

    return result;
  } catch (error) {
    console.error("Swipe error:", error);
    throw error;
  } finally {
    await session.endSession();
  }
}

async function undoSwipe(swiperId, targetId) {
  // 1. Quota Check (v3)
  try {
    await UsageService.useItem(swiperId, "REWIND");
  } catch (error) {
    if (error.message === "LIMIT_REACHED") {
      throw new Error("No Rewinds left for today!");
    }
    throw error;
  }

  const lastSwipe = await Swipe.findOne({ swiperId, targetId }).sort({
    createdAt: -1,
  });

  if (!lastSwipe) throw new Error("No swipe to undo");

  if (lastSwipe.action === "superlike") {
    // Note: Guide says super keens can be undone?
    // Usually Super Keens are high value, some apps block undo.
    // Keeping existing behavior unless asked.
    throw new Error("Superlike undo not allowed");
  }

  const match = await Match.findOne({
    users: { $all: [swiperId, targetId] },
  });
  if (match) throw new Error("Cannot undo after match");

  await Swipe.deleteOne({ _id: lastSwipe._id });

  if (redis) {
    await Promise.all([
      redis.sRem(`swiped:${swiperId}`, targetId.toString()),
      redis.del(`feed:${swiperId}`),
    ]);
  }

  return { success: true, message: "Swipe undone" };
}

module.exports = {
  getFeedService,
  doSwipe,
  undoSwipe,
};
