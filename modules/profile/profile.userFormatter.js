// Shared, Australia/Sydney-aware age calculation — see common/utils/calculate.age.js.
// (kept the "" empty-string return for missing dob to preserve this formatter's existing API contract)
const { calculateAge: calculateAgeShared } = require("../../common/utils/calculate.age");
const calculateAge = (dob) => (dob ? calculateAgeShared(dob) : "");

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
const { mapIdsToLabels } = require("../../common/utils/masterData.util");

const formatPublictargetProfile = (
  viewertargetProfile,
  targetProfile,
  swipeAction,
  matchRecord,
  isBoosted,
  blockStatus,
  masterMap // Added masterMap parameter
) => {
  if (!targetProfile) return null;

  // --- 📏 DYNAMIC DISTANCE ---
  let distanceText = "Unknown distance";
  if (
    viewertargetProfile?.location?.coordinates &&
    targetProfile?.location?.coordinates
  ) {
    const dist = calculateDistance(
      viewertargetProfile.location.coordinates[1],
      viewertargetProfile.location.coordinates[0],
      targetProfile.location.coordinates[1],
      targetProfile.location.coordinates[0],
    );
    distanceText = dist <= 1 ? "Nearby" : `${Math.round(dist)} km away`;
  }
  return {
    profile: {
      name: targetProfile.nickname || "",
      age: calculateAge(targetProfile.dob),
      gender: targetProfile.gender || "",
      bio: targetProfile.about || "",
      height: targetProfile.height ? `${targetProfile.height} cm` : "",
      title: targetProfile.jobTitle || "",
      company: targetProfile.company || "",
      school: targetProfile.school || "",
    },
    location: {
      city: targetProfile.location?.city || "",
      distance: distanceText,
    },
    photos: (targetProfile.photos || []).sort((a, b) => a.order - b.order),

    attributes: {
      zodiac: mapIdsToLabels(targetProfile.attributes?.zodiac, "zodiac", masterMap),
      education: mapIdsToLabels(targetProfile.attributes?.education, "education", masterMap),
      familyPlans: mapIdsToLabels(targetProfile.attributes?.familyPlans, "family_plans", masterMap),
      vaccination: mapIdsToLabels(targetProfile.attributes?.vaccination, "vaccination", masterMap),
      personalityType: mapIdsToLabels(targetProfile.attributes?.personalityType, "personality_type", masterMap),
      communicationStyle: mapIdsToLabels(targetProfile.attributes?.communicationStyle, "communication_style", masterMap),
      loveStyle: mapIdsToLabels(targetProfile.attributes?.loveStyle, "love_style", masterMap),
      bloodGroup: mapIdsToLabels(targetProfile.attributes?.bloodGroup, "blood_group", masterMap),
      pets: mapIdsToLabels(targetProfile.attributes?.pets, "pets", masterMap),
      drinking: mapIdsToLabels(targetProfile.attributes?.drinking, "drinking_habits", masterMap),
      smoking: mapIdsToLabels(targetProfile.attributes?.smoking, "smoking_habits", masterMap),
      workout: mapIdsToLabels(targetProfile.attributes?.workout, "workout", masterMap),
      dietary: mapIdsToLabels(targetProfile.attributes?.dietary, "dietary_preferences", masterMap),
      socialMedia: mapIdsToLabels(targetProfile.attributes?.socialMedia, "social_media", masterMap),
      sleeping: mapIdsToLabels(targetProfile.attributes?.sleeping, "sleeping_habits", masterMap),
      relationshipGoals: mapIdsToLabels(targetProfile.discovery?.relationshipGoal, "relationshipGoals", masterMap),
      religion: mapIdsToLabels(targetProfile.attributes?.religion, "religion", masterMap),
      interests: mapIdsToLabels(targetProfile.attributes?.interests, "interests", masterMap),
      languages: mapIdsToLabels(targetProfile.attributes?.languages, "languages", masterMap),
      music: mapIdsToLabels(targetProfile.attributes?.music, "music_preferences", masterMap),
      movies: mapIdsToLabels(targetProfile.attributes?.movies, "movie_preferences", masterMap),
      books: mapIdsToLabels(targetProfile.attributes?.books, "book_preferences", masterMap),
      travel: mapIdsToLabels(targetProfile.attributes?.travel, "travel_preferences", masterMap),
    },

    status: {
      isLiked: swipeAction?.action === "like",
      isSuperLike: swipeAction?.action === "superlike",
      isMatch: !!matchRecord, // 🔥 LIVE match status
      isBoosted: !!isBoosted, // 🔥 LIVE boost status
      isBlocked: !!blockStatus,
      BlockedDetail: blockStatus,
    },
    verificationStatus: targetProfile.verification?.status || "pending",
  };
};
module.exports = { formatPublictargetProfile };