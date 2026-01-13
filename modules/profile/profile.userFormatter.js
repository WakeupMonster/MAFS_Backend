const calculateAge = (dob) => {
  if (!dob) return "";
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

<<<<<<< HEAD
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
const formatPublictargetProfile = (viewertargetProfile, targetProfile, swipeAction, matchRecord, isBoosted) => {
  if (!targetProfile) return null;
=======
const formatPublicProfile = (user, profile, swipeAction) => {
  if (!profile) return null;
>>>>>>> origin/feature/raj

  // --- 📏 DYNAMIC DISTANCE ---
  let distanceText = "Unknown distance";
  if (viewertargetProfile?.location?.coordinates && targetProfile?.location?.coordinates) {
    const dist = calculateDistance(
      viewertargetProfile.location.coordinates[1], viewertargetProfile.location.coordinates[0],
      targetProfile.location.coordinates[1], targetProfile.location.coordinates[0]
    );
    distanceText = dist <= 1 ? "Nearby" : `${Math.round(dist)} km away`;
  }
  return {
<<<<<<< HEAD
    profile: {
      name: targetProfile.nickname || "",
      age: calculateAge(targetProfile.dob),
      gender: targetProfile.gender || "",
      bio: targetProfile.about || "",
      height: targetProfile.height ? `${targetProfile.height} cm` : "",
      title: targetProfile.jobTitle || "",
      company: targetProfile.company || "",
      school: targetProfile.school || ""
    },
    location: {
      city: targetProfile.location?.city || "",
      distance: distanceText 
    },
    photos: (targetProfile.photos || []).sort((a, b) => a.order - b.order),
    
       attributes : {
      zodiac: targetProfile.attributes?.zodiac || "",
      education: targetProfile.attributes?.education || "",
      familyPlans: targetProfile.attributes?.familyPlans || "",
      vaccination: targetProfile.attributes?.vaccination || "",
      personalityType: targetProfile.attributes?.personalityType || "",
      communicationStyle: targetProfile.attributes?.communicationStyle || "",
      loveStyle: targetProfile.attributes?.loveStyle || "",
      bloodGroup: targetProfile.attributes?.bloodGroup || "",
       pets: targetProfile.attributes?.pets || "",
      drinking: targetProfile.attributes?.drinking || "",
      smoking: targetProfile.attributes?.smoking || "",
      workout: targetProfile.attributes?.workout || "",
      dietary: targetProfile.attributes?.dietary || "",
      socialMedia: targetProfile.attributes?.socialMedia || "",
      sleeping: targetProfile.attributes?.sleeping || "",
       relationshipGoals: targetProfile.discovery?.relationshipGoal || "",
    religion: targetProfile.attributes?.religion || "",
     interests: targetProfile.attributes?.interests || [],
    languages: targetProfile.attributes?.languages || [],
      music: targetProfile.attributes?.music || [],
      movies: targetProfile.attributes?.movies || [],
      books: targetProfile.attributes?.books || [],
      travel: targetProfile.attributes?.travel || []
=======
    // id: profile.userId,
    name: profile.nickname || "",
    // displayName: `${profile.nickname || "User"}, ${calculateAge(profile.dob)}`,
    // age: profile.age || 0,
    age: profile.age || calculateAge(profile.dob),
    gender: {
      display: profile.gender || "",
      pronouns: profile.pronouns || "she/her/hers", // Figma screen par pronouns hain
    },
    verificationStatus: profile.verification?.status || "pending",
    bio: profile.about || "",
    physical: {
      height: profile.height ? `${profile.height} cm` : "",
      weight: profile.weight ? `${profile.weight} kg` : "",
    },
    work: {
      title: profile.jobTitle || "",
      company: profile.company || "",
    },
    education: {
      school: profile.school || "",
    },
    location: {
      city: profile.location?.city || "",
      distance: "5 kilometer away", // Ye dynamic calculation se aayega
    },
    photos: profile.photos || [],

    // Figma: Basics Section
    basics: {
      zodiac: profile.attributes?.zodiac || "",
      education: profile.attributes?.education || "",
      familyPlans: profile.attributes?.familyPlans || "",
      vaccination: profile.attributes?.vaccination || "",
      personalityType: profile.attributes?.personalityType || "",
      communicationStyle: profile.attributes?.communicationStyle || "",
      loveStyle: profile.attributes?.loveStyle || "",
      bloodGroup: profile.attributes?.bloodGroup || "",
    },

    // Figma: Lifestyle Section
    lifestyle: {
      pets: profile.attributes?.pets || "",
      drinking: profile.attributes?.drinking || "",
      smoking: profile.attributes?.smoking || "",
      workout: profile.attributes?.workout || "",
      dietary: profile.attributes?.dietary || "",
      socialMedia: profile.attributes?.socialMedia || "",
      sleeping: profile.attributes?.sleeping || "",
    },

    // Figma: Detailed Preferences
    interests: profile.attributes?.interests || [],
    languages: profile.attributes?.languages || [],
    relationshipGoals: profile.discovery?.relationshipGoal || "",
    religion: profile.attributes?.religion || "",

    preferences: {
      music: profile.attributes?.music || [],
      movies: profile.attributes?.movies || [],
      books: profile.attributes?.books || [],
      travel: profile.attributes?.travel || [],
>>>>>>> origin/feature/raj
    },
    
    status: {
<<<<<<< HEAD
      isLiked: swipeAction?.action === "like",
      isSuperLike: swipeAction?.action === "superlike",
      isMatch: !!matchRecord, // 🔥 LIVE match status
      isBoosted: !!isBoosted, // 🔥 LIVE boost status
      isBlocked: false 
    },
    verificationStatus: targetProfile.verification?.status || "pending"
  };
};
module.exports = { formatPublictargetProfile };
=======
      isLiked: !!swipeAction,
      isSuperLike: swipeAction?.action === "superlike",
      isMatch: false, // Match model se check kar sakte hain
      isBlockedByMe: false,
    },
  };
};

module.exports = { formatPublicProfile };
>>>>>>> origin/feature/raj
