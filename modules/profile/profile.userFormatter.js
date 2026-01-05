const calculateAge = (dob) => {
  if (!dob) return "";
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const formatPublicProfile = (user, profile,swipeAction) => {
  if (!profile) return null;

  return {
    // id: profile.userId,
    name: profile.nickname || "",
    // displayName: `${profile.nickname || "User"}, ${calculateAge(profile.dob)}`,
    // age: profile.age || 0,
    age: profile.age || calculateAge(profile.dob),
    gender: {
      display: profile.gender || "",
      pronouns: profile.pronouns || "she/her/hers" // Figma screen par pronouns hain
    },
    verificationStatus: profile.verification?.status || "pending",
    bio: profile.about || "",
    physical: {
      height: profile.height ? `${profile.height} cm` : "",
      weight: profile.weight ? `${profile.weight} kg` : ""
    },
    work: {
      title: profile.jobTitle || "",
      company: profile.company || ""
    },
    education: {
      school: profile.school || ""
    },
    location: {
      city: profile.location?.city || "",
      distance: "5 kilometer away" // Ye dynamic calculation se aayega
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
      bloodGroup: profile.attributes?.bloodGroup || ""
    },

    // Figma: Lifestyle Section
    lifestyle: {
      pets: profile.attributes?.pets || "",
      drinking: profile.attributes?.drinking || "",
      smoking: profile.attributes?.smoking || "",
      workout: profile.attributes?.workout || "",
      dietary: profile.attributes?.dietary || "",
      socialMedia: profile.attributes?.socialMedia || "",
      sleeping: profile.attributes?.sleeping || ""
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
      travel: profile.attributes?.travel || []
    },
    status: {
            isLiked: !!swipeAction,
            isSuperLike: swipeAction?.action === "superlike",
            isMatch: false, // Match model se check kar sakte hain
            isBlockedByMe: false 
        }
  };
};

module.exports = { formatPublicProfile };