const calculateAge = (dob) => {
  if (!dob) return "";
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

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
    },
    
    status: {
      isLiked: swipeAction?.action === "like",
      isSuperLike: swipeAction?.action === "superlike",
      isMatch: !!matchRecord, // 🔥 LIVE match status
      isBoosted: !!isBoosted, // 🔥 LIVE boost status
      isBlocked: false 
    },
    verificationStatus: targetProfile.verification?.status || "pending"
  };
};


// const formatPublictargetProfile = (user, targetProfile,swipeAction) => {
//   if (!targetProfile) return null;
  

//   return {
//     targetProfile : {
//       name: targetProfile.nickname || "",
//        age: targetProfile.age || calculateAge(targetProfile.dob),
//         gender: targetProfile.gender || "",
//         bio: targetProfile.about || "",
//         height: targetProfile.height ? `${targetProfile.height} cm` : "",
//         title: targetProfile.jobTitle || "",
//       company: targetProfile.company || "",
//        school: targetProfile.school || ""
//         // weight: targetProfile.weight ? `${targetProfile.weight} kg` : ""
//     },
//     location: {
//       city: targetProfile.location?.city || "",
//       distance: "5 kilometer away" 
//     },
//     photos: targetProfile.photos || [],
    
//     attributes : {
//       zodiac: targetProfile.attributes?.zodiac || "",
//       education: targetProfile.attributes?.education || "",
//       familyPlans: targetProfile.attributes?.familyPlans || "",
//       vaccination: targetProfile.attributes?.vaccination || "",
//       personalityType: targetProfile.attributes?.personalityType || "",
//       communicationStyle: targetProfile.attributes?.communicationStyle || "",
//       loveStyle: targetProfile.attributes?.loveStyle || "",
//       bloodGroup: targetProfile.attributes?.bloodGroup || "",
//        pets: targetProfile.attributes?.pets || "",
//       drinking: targetProfile.attributes?.drinking || "",
//       smoking: targetProfile.attributes?.smoking || "",
//       workout: targetProfile.attributes?.workout || "",
//       dietary: targetProfile.attributes?.dietary || "",
//       socialMedia: targetProfile.attributes?.socialMedia || "",
//       sleeping: targetProfile.attributes?.sleeping || "",
//        relationshipGoals: targetProfile.discovery?.relationshipGoal || "",
//     religion: targetProfile.attributes?.religion || "",
//      interests: targetProfile.attributes?.interests || [],
//     languages: targetProfile.attributes?.languages || [],
//       music: targetProfile.attributes?.music || [],
//       movies: targetProfile.attributes?.movies || [],
//       books: targetProfile.attributes?.books || [],
//       travel: targetProfile.attributes?.travel || []
//     },
//     status: {
//             isLiked: !!swipeAction,
//             isSuperLike: swipeAction?.action === "superlike",
//             isMatch: false, // Match model se check kar sakte hain
//             isBlockedByMe: false,
//             verificationStatus: targetProfile.verification?.status || "pending"
//         }
//   };
// };
module.exports = { formatPublictargetProfile };