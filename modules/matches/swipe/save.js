// async function getFeedService(userId, limit, page) {
//   const CACHE_KEY = `feed:${userId.toString()}:${limit}:${page}`;
//   const SEEN_KEY = `feed:seen:${userId.toString()}`;
//   const CACHE_TTL = 30;
//   const SEEN_TTL = 60 * 60 * 24;

//   // If user is on page 1, we use seenProfiles to exclude.
//   // If page > 1, we rely on offset (skip) for pagination.
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
//         console.log("Feed from redis cache");
//         const parsed = JSON.parse(cached);
//         return {
//           success: true,
//           count: parsed.data?.length,
//           cached: true,
//           data: parsed.data
//         };
//       }
//     } catch (err) {
//       console.error("Redis Error:", err);
//     }
//   }

//   const [
//     swipes, matches, myBlocked, blockedMe,
//     myReports, superlikes, nonActiveUsers
//   ] = await Promise.all([
//     Swipe.find({ swiperId: userId, action: { $in: ["like", "pass"] } }).distinct("targetId"),
//     Match.find({ users: userId }).distinct("users"),
//     Block.find({ blockerId: userId }).distinct("blockedId"),
//     Block.find({ blockedId: userId }).distinct("blockerId"),
//     Report.find({ reporterId: userId }).distinct("reportedId"),
//     Swipe.find({ targetId: userId, action: "superlike" }).distinct("swiperId"),
//     User.find({ accountStatus: { $ne: "active" } }).distinct("_id")
//   ]);

//   const blockedPhoneHashes = await BlockedContact.find({ userId }).distinct("blockedPhoneHash");
//   let blockedByContactUserIds = [];

//   if (blockedPhoneHashes.length) {
//     const users = await User.find({ phoneHash: { $in: blockedPhoneHashes } }).distinct("_id");
//     blockedByContactUserIds = users.map(id => id.toString());
//   }

//   const superlikeSet = new Set(superlikes.map(id => id.toString()));

//   // ═══════════════════════════════════════════════════════
//   // ✅ FIX: Logic for dynamic pool (Excluding Seen Profiles)
//   // ═══════════════════════════════════════════════════════
//   const baseExclude = [
//     ...new Set([
//       ...swipes, ...matches, ...myBlocked, ...blockedMe,
//       ...myReports, ...blockedByContactUserIds,
//       ...nonActiveUsers, userId
//     ])
//   ].map(id => id.toString());

//   // Only exclude seenProfiles if we are on first page or using infinite scroll style
//   // If the user specifically paginates (page > 1), we shouldn't exclude seenProfiles AND skip,
//   // because that causes double skipping.
//   const excludeIds = page === 1
//     ? [...new Set([...baseExclude, ...seenProfiles])]
//     : baseExclude;

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

//   let profiles = await Profile.find(query)
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(limit)
//     .lean();

//   // ═══════════════════════════════════════════════════════
//   // ✅ FIX: Proper Retry Logic (RE-QUERY immediately)
//   // ═══════════════════════════════════════════════════════
//   if (redis && profiles.length === 0 && seenProfiles.length > 0 && page === 1) {
//     console.log("Exhausted seen pool, resetting seenProfiles and retrying...");
//     await redis.del(SEEN_KEY);
//     seenProfiles = [];

//     // Update query to NOT include seenProfiles
//     query.userId = { $nin: baseExclude };

//     profiles = await Profile.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();
//   }

//   if (profiles.length === 0) {
//     return { success: true, count: 0, data: [], message: "No more profiles found" };
//   }

//   const boostKeys = profiles.map(p => `boost:${p.userId.toString()}`);
//   const boostResults = await redis.mGet(boostKeys);

//   const myInterests = myProfile.attributes?.interests || myProfile.interests || [];
//   const myPreferredInterests = discovery.preferredInterests || [];
//   const myAdvancedFilters = discovery.advancedFilters || {};
//   const activeSearchGoal = discovery.filterRelationshipGoal
//     || discovery.relationshipGoal
//     || myProfile.relationshipGoal;

//   const transformedProfiles = profiles.map((profile, index) => {
//     const targetAttr = profile.attributes || {};
//     const targetInterests = profile.discovery?.preferredInterests || [];
//     const isSuperliked = superlikeSet.has(profile.userId.toString());
//     const isBoosted = boostResults?.[index] === "1";

//     let compatibilityScore = 0;
//     let priorityScore = 0;

//     if (isSuperliked) priorityScore += 1000;
//     if (isBoosted) priorityScore += 500;

//     const commonWithPreferred = targetInterests.filter(i => myPreferredInterests.includes(i));
//     const commonWithOwn = targetInterests.filter(i => myInterests.includes(i));
//     const allCommon = [...new Set([...commonWithPreferred, ...commonWithOwn])];

//     compatibilityScore += commonWithPreferred.length * 8;
//     compatibilityScore += commonWithOwn.filter(i => !commonWithPreferred.includes(i)).length * 5;

//     const targetGoal = profile.discovery?.relationshipGoal || profile.relationshipGoal;
//     if (activeSearchGoal && targetGoal && targetGoal === activeSearchGoal) {
//       compatibilityScore += 20;
//     }

//     const matchedTraits = [];
//     const traitWeights = { smoking: 8, drinking: 8, zodiac: 5, pets: 6, workout: 7, diet: 5, education: 6, religion: 7, languages: 5 };

//     Object.keys(traitWeights).forEach(trait => {
//       const myFilterValue = myAdvancedFilters[trait];
//       const targetValue = targetAttr[trait];
//       if (myFilterValue && targetValue) {
//         if (Array.isArray(myFilterValue)) {
//           if (Array.isArray(targetValue)) {
//             if (targetValue.some(v => myFilterValue.includes(v))) {
//               compatibilityScore += traitWeights[trait];
//               matchedTraits.push(trait);
//             }
//           } else if (myFilterValue.includes(targetValue)) {
//             compatibilityScore += traitWeights[trait];
//             matchedTraits.push(trait);
//           }
//         } else if (targetValue === myFilterValue) {
//           compatibilityScore += traitWeights[trait];
//           matchedTraits.push(trait);
//         }
//       }
//     });

//     let distanceKm = 0;
//     if (myProfile.location?.coordinates && profile.location?.coordinates) {
//       distanceKm = calculateDistance(
//         myProfile.location.coordinates[1], myProfile.location.coordinates[0],
//         profile.location.coordinates[1], profile.location.coordinates[0]
//       );
//     }

//     if (distanceKm <= 5) compatibilityScore += 15;
//     else if (distanceKm <= 15) compatibilityScore += 10;
//     else if (distanceKm <= 30) compatibilityScore += 5;
//     else if (distanceKm <= 50) compatibilityScore += 2;

//     const finalMatchScore = Math.min(Math.max(compatibilityScore, 1), 100);

//     let compatibilityLabel;
//     if (finalMatchScore >= 80) compatibilityLabel = "Excellent Match 💯";
//     else if (finalMatchScore >= 60) compatibilityLabel = "Great Match 🔥";
//     else if (finalMatchScore >= 40) compatibilityLabel = "Good Match 👍";
//     else if (finalMatchScore >= 20) compatibilityLabel = "Worth Exploring 🌟";
//     else compatibilityLabel = "New Discovery ✨";

//     const dynamicHighlights = [];
//     if (allCommon.length > 0) {
//       dynamicHighlights.push({
//         type: "INTEREST_MATCH",
//         icon: "🔥",
//         title: "Common Vibe",
//         description: allCommon.length > 1 ? `You both love ${allCommon[0]} +${allCommon.length - 1} more` : `You both love ${allCommon[0]}`
//       });
//     }

//     if (targetGoal && targetGoal === activeSearchGoal) {
//       dynamicHighlights.push({ type: "GOAL_MATCH", icon: "🎯", title: "Same Intent", description: `Both looking for ${targetGoal}` });
//     }

//     if (matchedTraits.length > 0) {
//       dynamicHighlights.push({
//         type: "TRAIT_MATCH",
//         icon: "✅",
//         title: "Lifestyle Match",
//         description: matchedTraits.length > 1 ? `Matches on ${matchedTraits[0]} +${matchedTraits.length - 1} more` : `Matches on ${matchedTraits[0]} habits`
//       });
//     }

//     dynamicHighlights.push({ type: "LOCATION", icon: "📍", title: "Nearby", description: distanceKm <= 1 ? "In your neighborhood" : `${distanceKm} km away` });

//     if (profile.verification?.status === "approved") {
//       dynamicHighlights.push({ type: "VERIFIED", icon: "🛡️", title: "Verified", description: "Authenticity checked by MAFS" });
//     }

//     if (dynamicHighlights.length < 6) {
//       if (profile.about && profile.about.length > 20) {
//         dynamicHighlights.push({ type: "BIO_PREVIEW", icon: "✍️", title: "About Me", description: profile.about.substring(0, 40) + "..." });
//       }
//       dynamicHighlights.push({ type: "ACTIVITY", icon: "⚡", title: "Active Now", description: "This user is looking for a match!" });
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
//       images: (profile.photos || [])
//         .sort((a, b) => a.order - b.order)
//         .map(p => ({ url: p.url })),
//       relationshipGoal: targetGoal || "Not specified",
//       attributes: targetAttr,
//       discoveryFilters: {
//         interest: profile.discovery?.preferredInterests || [],
//       },
//       context: {
//         matchScore: finalMatchScore,
//         compatibilityLabel,
//         isSuperLikeSender: isSuperliked,
//         isBoosted: !!isBoosted,
//         commonInterests: allCommon
//       },
//       dynamicHighlights: dynamicHighlights.slice(0, 6)
//     };
//   });

//   transformedProfiles.sort((a, b) => {
//     if (a.context.isSuperLikeSender && !b.context.isSuperLikeSender) return -1;
//     if (!a.context.isSuperLikeSender && b.context.isSuperLikeSender) return 1;
//     if (a.context.isBoosted && !b.context.isBoosted) return -1;
//     if (!a.context.isBoosted && b.context.isBoosted) return 1;
//     return b.context.matchScore - a.context.matchScore;
//   });

//   const finalResult = transformedProfiles.slice(0, limit);

//   if (redis && finalResult.length) {
//     // ═══════════════════════════════════════════════════════
//     // ✅ FIX: Update Seen Profiles properly
//     // ═══════════════════════════════════════════════════════
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



