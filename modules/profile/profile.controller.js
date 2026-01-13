/* eslint-disable no-unused-vars */
const Profile = require("./profile.model");
const cache = require("../../config/cache");
const { uploadStream, destroy } = require("../upload/cloudinary.service");
const redis = require("../../config/cache");
const User = require("../auth/auth.model");
const BlockedContact = require("../BlockedContact/blockedContacts.model");
const Block = require("../profile/user.block");
const { formatProfileResponse } = require("./profile.formatter");
const UserSubscription = require("../auth/UserSubscription.model");
const { formatPublictargetProfile } = require("./profile.userFormatter");

async function getFullUserData(userId, existingProfile = null) {
  const [user, profile, blockedContacts, blockedUser, subData] = await Promise.all([
    User.findById(userId).lean(),
    existingProfile ? Promise.resolve(existingProfile) : Profile.findOne({ userId }),
    BlockedContact.find({ userId }).lean(),
    Block.find({ blockerId: userId }).lean(),
    UserSubscription.findOne({ userId })
  ]);

  let finalSub = subData;
  if (!finalSub) {
    finalSub = await UserSubscription.create({ userId });
  } else {
    // Agar lean use karte hain to methods work nahi karte, isliye instance logic check
    if (typeof finalSub.resetIfNeeded === 'function') finalSub.resetIfNeeded();
  }

  return { user, profile, blockedContacts, blockedUser, subData: finalSub };
}


async function getOrCreateProfile(userId) {
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    profile = await Profile.create({
      userId,
      onboardingStartedAt: new Date(),
    });
  }
  return profile;
}

async function clearProfileCache(userId) {
  try {
    await Promise.all([
      cache.del(`profile:${userId}`),
      cache.del(`profile:status:${userId}`)
    ]);
  } catch (err) {
    console.log("Cache clear warning:", err.message);
  }
}


exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;
    let profile = await Profile.findOne({ userId });

    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" })

    if (updateData.profile) {
      const p = updateData.profile;
      const basicFields = ['nickname', 'dob', 'gender', 'height', 'about', 'jobTitle', 'company', 'school', 'pronouns', 'weight'];
      basicFields.forEach(field => { if (p[field] !== undefined) profile[field] = p[field]; });


      if (p.nickname) {
        const existing = await Profile.findOne({ nickname: p.nickname, userId: { $ne: userId } }).lean();
        if (existing) return res.status(400).json({ success: false, code: "NICKNAME_TAKEN", message: "Nickname taken" });
      }
    }

    if (updateData.attributes) {
      const attr = updateData.attributes;
      profile.attributes = profile.attributes || {};
      const traitFields = ['zodiac', 'education', 'familyPlans', 'personalityType', 'communicationStyle', 'loveStyle', 'bloodType', 'covidVaccine', 'religion', 'pets', 'drinking', 'smoking', 'workout', 'dietary', 'sleeping', 'socialMedia'];
      traitFields.forEach(field => { if (attr[field] !== undefined) profile.attributes[field] = attr[field]; });

      const arrayTraits = ['languages', 'interests', 'music', 'movies', 'books', 'travel'];
      arrayTraits.forEach(field => {
        if (attr[field] !== undefined) profile.attributes[field] = Array.isArray(attr[field]) ? attr[field] : [attr[field]];
      });
    }

    if (updateData.discovery) {
      const disc = updateData.discovery;
      profile.discovery = profile.discovery || {};
      if (disc.distanceRange) profile.discovery.distanceRange = disc.distanceRange;
      if (disc.relationshipGoal) profile.discovery.relationshipGoal = disc.relationshipGoal;
      if (disc.globalVisibility) profile.discovery.globalVisibility = disc.globalVisibility;

      if (disc.ageRange) {
        profile.discovery.ageRange = {
          min: disc.ageRange.min || profile.discovery.ageRange.min,
          max: disc.ageRange.max || profile.discovery.ageRange.max,
        };
      }
      if (disc.showMeGender) profile.discovery.showMeGender = Array.isArray(disc.showMeGender) ? disc.showMeGender : [disc.showMeGender];
    }

    profile.lastProfileUpdate = new Date();
    await profile.save();

    const data = await getFullUserData(userId, profile);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData) }
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const data = await getFullUserData(req.user._id);
    if (!data.profile) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: { user: formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData) }
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
};

// exports.updateProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const updateData = req.body;
//     const profile = await Profile.findOne({ userId });

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//      if (updateData.profile || updateData.attributes || updateData.discovery) {
//       const { profile: profileData, attributes} = updateData;

//       // 1. Update profile fields
//       if (profileData) {
//         // Map new structure to existing fields
//         if (profileData.about !== undefined) profile.about_me = profileData.about;
//         if (profileData.jobTitle !== undefined) profile.jobtitle = profileData.jobTitle;

//         // Direct field updates
//         const profileFields = ['nickname', 'dob', 'age', 'gender', 'height', 'company', 'school','occupation' ];
//         profileFields.forEach(field => {
//           if (profileData[field] !== undefined) {
//             profile[field] = profileData[field];
//           }
//         });
//       }
//       // 2. Handle attributes
//       if (attributes) {
//         profile.attributes = profile.attributes || {};

// // if (attributes.relationshipGoal) {
// //   profile.attributes.relationshipGoal = {
// //     title: attributes.relationshipGoal.title || "",
// //     subtitle: attributes.relationshipGoal.subtitle || ""
// //   };
// // }

//         // Basic attributes
//         const attributeFields = [
//           'zodiac', 'education', 'familyPlans', 'personalityType',
//           'communicationStyle', 'loveStyle', 'pets', 'drinking',
//           'smoking', 'workout', 'dietary', 'sleeping', 'socialMedia', 'religion'
//         ];

//         attributeFields.forEach(field => {
//           if (attributes[field] !== undefined) {
//             profile.attributes[field] = attributes[field];
//           }
//         });
//         // Array fields
//         const arrayFields = ['languages', 'interests', 'music', 'movies', 'books', 'travel'];
//         arrayFields.forEach(field => {
//           if (attributes[field] !== undefined) {
//             profile.attributes[field] = Array.isArray(attributes[field])
//               ? attributes[field]
//               : [attributes[field]];
//           }
//         });
//       }
//     }

//     // Helper function to safely update fields
//     const updateField = (field, value, trim = true) => {
//       if (value !== undefined) {
//         profile[field] = trim ? String(value).trim() : value;
//       }
//     };

//     // Basic Info
//     if (updateData.fullName !== undefined) {
//       profile.fullName = updateData.fullName.trim();
//     }

//     if (updateData.nickname !== undefined) {
//       const nickname = updateData.nickname.trim();
//       const existing = await Profile.findOne({
//         nickname,
//         userId: { $ne: userId }
//       });
//       if (existing) {
//         return res.status(400).json({
//           success: false,
//           code: "NICKNAME_TAKEN",
//           message: "Nickname already taken"
//         });
//       }
//       profile.nickname = nickname;
//     }

//     if (updateData.gender !== undefined) {
//       const validGenders = ["male", "female", "non-binary", "trans-man", "trans-women", "genderqueer", "everyone", "other"];
//       if (!validGenders.includes(updateData.gender)) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_GENDER",
//           message: "Invalid gender value"
//         });
//       }
//       profile.gender = updateData.gender;
//     }

//     if (updateData.dob !== undefined) {
//       const dob = new Date(updateData.dob);
//       if (isNaN(dob.getTime())) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_DOB",
//           message: "Invalid date of birth"
//         });
//       }
//       profile.dob = dob;
//       // Calculate age
//       const today = new Date();
//       const birthDate = new Date(dob);
//       let age = today.getFullYear() - birthDate.getFullYear();
//       const m = today.getMonth() - birthDate.getMonth();
//       if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
//         age--;
//       }
//       profile.age = age;
//     }

//     if(updateData.interests !== undefined){
//       profile.interests = updateData.interests;
//     }
//     // About Me
//     if (updateData.about_me !== undefined) {
//       profile.about_me = updateData.about_me.trim();
//     }

//     // Basic Details
//     updateField('height', updateData.height);
//     updateField('occupation', updateData.occupation);
//     updateField('company', updateData.company);
//     updateField('school', updateData.school);
//     updateField('jobtitle', updateData.jobtitle);

//     // Languages
//     if (Array.isArray(updateData.languages)) {
//       profile.languages = updateData.languages;
//     }

//     // Lifestyle
//     // if (updateData.lifestyle) {
//     //   if (updateData.lifestyle.pets) {
//     //     const validPets = ["dog", "cat", "bird", "fish"];
//     //     if (!validPets.includes(updateData.lifestyle.pets)) {
//     //       return res.status(400).json({
//     //         success: false,
//     //         code: "INVALID_PET_TYPE",
//     //         message: "Invalid pet type"
//     //       });
//     //     }
//     //     profile.lifestyle = profile.lifestyle || {};
//     //     profile.lifestyle.pets = updateData.lifestyle.pets;
//     //   }

//     //   if (updateData.lifestyle.drinking !== undefined) {
//     //     const validDrinking = ["never", "socially", "regularly"];
//     //     if (!validDrinking.includes(updateData.lifestyle.drinking)) {
//     //       return res.status(400).json({
//     //         success: false,
//     //         code: "INVALID_DRINKING_VALUE",
//     //         message: "Invalid drinking value"
//     //       });
//     //     }
//     //     profile.lifestyle = profile.lifestyle || {};
//     //     profile.lifestyle.drinking = updateData.lifestyle.drinking;
//     //   }

//     //   if (updateData.lifestyle.exercise !== undefined) {
//     //     const validExercise = ["never", "sometimes", "regularly", "daily"];
//     //     if (!validExercise.includes(updateData.lifestyle.exercise)) {
//     //       return res.status(400).json({
//     //         success: false,
//     //         code: "INVALID_EXERCISE_VALUE",
//     //         message: "Invalid exercise value"
//     //       });
//     //     }
//     //     profile.lifestyle = profile.lifestyle || {};
//     //     profile.lifestyle.exercise = updateData.lifestyle.exercise;
//     //   }
//     // }
// // In your updateProfile function

//     // Basics
//     if (updateData.basics) {
//       profile.basics = profile.basics || {};

//       // Education
//       if (updateData.basics.education) {
//         profile.basics.education = profile.basics.education || {};

//         if (updateData.basics.education.level) {
//           const validEducationLevels = ["high_school", "bachelors", "masters", "phd", "trade_school", "prefer_not_to_say"];
//           if (!validEducationLevels.includes(updateData.basics.education.level)) {
//             return res.status(400).json({
//               success: false,
//               code: "INVALID_EDUCATION_LEVEL",
//               message: "Invalid education level"
//             });
//           }
//           profile.basics.education.level = updateData.basics.education.level;
//         }

//         if (updateData.basics.education.institution !== undefined) {
//           profile.basics.education.institution = updateData.basics.education.institution.trim();
//         }
//       }

//       // Zodiac
//       if (updateData.basics.zodiac) {
//         const validZodiacs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
//                             "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
//         if (!validZodiacs.includes(updateData.basics.zodiac)) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_ZODIAC",
//             message: "Invalid zodiac sign"
//           });
//         }
//         profile.basics.zodiac = updateData.basics.zodiac;
//       }

//       // Other basic fields
//       if (updateData.basics.familyPlans !== undefined) {
//         profile.basics.familyPlans = updateData.basics.familyPlans.trim();
//       }

//       if (updateData.basics.PersonalityType) {
//         const validPersonalityTypes = ["intj", "entj", "entp", "istp", "isfp"];
//         if (!validPersonalityTypes.includes(updateData.basics.PersonalityType)) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_PERSONALITY_TYPE",
//             message: "Invalid personality type"
//           });
//         }
//         profile.basics.PersonalityType = updateData.basics.PersonalityType;
//       }

//       if (updateData.basics.communicationStyle) {
//         const validStyles = ["chattyCathy", "listener", "joker", "deepThinker",
//                            "sarcasticWit", "easyGoing", "storyTeller", "straightShooter"];
//         if (!validStyles.includes(updateData.basics.communicationStyle)) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_COMMUNICATION_STYLE",
//             message: "Invalid communication style"
//           });
//         }
//         profile.basics.communicationStyle = updateData.basics.communicationStyle;
//       }

//       if (updateData.basics.loveStyle) {
//         const validLoveStyles = ["hopelessRomantic", "bestFriend", "adventureSeeker", "careGiver"];
//         if (!validLoveStyles.includes(updateData.basics.loveStyle)) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_LOVE_STYLE",
//             message: "Invalid love style"
//           });
//         }
//         profile.basics.loveStyle = updateData.basics.loveStyle;
//       }
//     }

//     // Preferences
//     if (updateData.discovery) {
//       // Age Range
//       if (updateData.discovery.ageRange) {
//         if (updateData.discovery.ageRange.min !== undefined) {
//           const minAge = parseInt(updateData.discovery.ageRange.min);
//           if (isNaN(minAge) || minAge < 18 || minAge > 100) {
//             return res.status(400).json({
//               success: false,
//               code: "INVALID_MIN_AGE",
//               message: "Minimum age must be between 18 and 100"
//             });
//           }
//           profile.discovery.ageRange.min = minAge;
//         }

//         if (updateData.discovery.ageRange.max !== undefined) {
//           const maxAge = parseInt(updateData.discovery.ageRange.max);
//           if (isNaN(maxAge) || maxAge < 18 || maxAge > 100) {
//             return res.status(400).json({
//               success: false,
//               code: "INVALID_MAX_AGE",
//               message: "Maximum age must be between 18 and 100"
//             });
//           }
//           profile.discovery.ageRange.max = maxAge;
//         }

//         // Ensure min <= max
//         if (profile.discovery.ageRange.min > profile.discovery.ageRange.max) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_AGE_RANGE",
//             message: "Minimum age cannot be greater than maximum age"
//           });
//         }
//       }

//       // Distance Range
//       if (updateData.discovery.distanceRange !== undefined) {
//         const distance = parseInt(updateData.discovery.distanceRange);
//         if (isNaN(distance) || distance < 1 || distance > 500) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_DISTANCE",
//             message: "Distance must be between 1 and 500 km"
//           });
//         }
//         profile.discovery.distanceRange = distance;
//       }
//       if (updateData.discovery?.relationshipGoal) {
//   profile.discovery.relationshipGoal = {
//     key: updateData.discovery.relationshipGoal.key || "",
//     title: updateData.discovery.relationshipGoal.title || "",
//     subtitle: updateData.discovery.relationshipGoal.subtitle || ""
//   };
// }

//       // Gender Preference
//       if (updateData.discovery.showMeGender) {
//         if (!Array.isArray(updateData.discovery.showMeGender)) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_GENDER_PREFERENCE",
//             message: "Gender preference must be an array"
//           });
//         }

//         const validGenders = ["male", "female", "non-binary", "trans-man", "trans-women", "everyone", "other"];
//         const invalidGenders = updateData.discovery.showMeGender.filter(
//           gender => !validGenders.includes(gender)
//         );

//         if (invalidGenders.length > 0) {
//           return res.status(400).json({
//             success: false,
//             code: "INVALID_GENDER_VALUES",
//             message: `Invalid gender values: ${invalidGenders.join(", ")}`
//           });
//         }

//         profile.discovery.showMeGender = updateData.discovery.showMeGender;
//       }
//     }

//     // Update the last updated timestamp
//     profile.lastProfileUpdate = new Date();

//     // const response = formatResponse(profile);

//     // Save the updated profile
//     await profile.save();

//     // Return the updated profile
//     res.json({
//       success: true,
//       message: "Profile updated successfully",
//       // data: response
//     });

//   } catch (error) {
//     console.error("Error updating profile:", error);
//     res.status(500).json({
//       success: false,
//       code: "INTERNAL_SERVER_ERROR",
//       message: "An error occurred while updating the profile"
//     });
//   }
// };

// ========================================
// 2. UPLOAD PHOTOS
// ========================================
module.exports.uploadPhotos = async (req, res) => {
  try {
    const userId = req.user._id;
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ success: false, message: "No files uploaded" });

    let profile = await getOrCreateProfile(userId);
    if (profile.photos.length + files.length > 6) {
      return res.status(400).json({ success: false, message: `Maximum 6 photos allowed.` });
    }

    const uploadPromises = files.map(file => uploadStream(file.buffer, {
      folder: `mafs/users/${userId}/photos`,
      transformation: [{ width: 1080, height: 1350, crop: "fill", quality: "auto:good" }]
    }));

    const newPhotosResults = await Promise.all(uploadPromises);

    newPhotosResults.forEach((result, index) => {
      profile.photos.push({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        uploadedAt: new Date(),
        order: profile.photos.length + 1,
        isPrimary: profile.photos.length === 0 && index === 0
      });
    });

    await profile.save();
    const [data] = await Promise.all([getFullUserData(userId, profile), clearProfileCache(userId)]);
    res.json({
      success: true,
      message: `${newPhotosResults.length} photo uploaded successfully`,
      data: { user: formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to upload photos" });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { publicId } = req.body;
    const profile = await Profile.findOne({ userId });

    const photoIndex = profile?.photos.findIndex(p => p.publicId === publicId);
    if (photoIndex === -1 || !profile) return res.status(404).json({ success: false, message: "Photo not found" });

    await destroy(publicId);
    profile.photos.splice(photoIndex, 1);
    profile.photos.forEach((photo, index) => {
      photo.order = index + 1;
      photo.isPrimary = index === 0;
    });

    await profile.save();
    const [data] = await Promise.all([getFullUserData(userId, profile), clearProfileCache(userId)]);

    res.json({
      success: true,
      message: "photo deleted successfully",
      data: { user: formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reorderPhotos = async (req, res) => {
  try {
    const userId = req.user._id;
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ success: false, message: "photoIds array is required" });

    const profile = await Profile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
    if (photoIds.length !== profile.photos.length) return res.status(400).json({ success: false, message: "Photo count mismatch" });

    const photoMap = new Map();
    profile.photos.forEach(photo => photoMap.set(photo.publicId.toString(), photo));

    const reorderedPhotos = photoIds.map((id, index) => {
      const photo = photoMap.get(id.trim());
      if (!photo) throw new Error(`Invalid photoId: ${id}`);
      return { ...photo.toObject(), order: index + 1, isPrimary: index === 0 };
    });

    profile.photos = reorderedPhotos;

    await profile.save();
    const [data] = await Promise.all([getFullUserData(userId, profile), clearProfileCache(userId)]);

    res.json({
      success: true,
      message: "Photos reordered successfully",
      data: { user: formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData) }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports.uploadSelfie = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!req.file) return res.status(400).json({ success: false, message: "No file" });

    // Step 1: Pehle hi baki data fetch karlo parallel mein
    const data = await getFullUserData(userId);
    
    // Step 2: IMMEDIATE RESPONSE (Milli-seconds)
    // Hum user ko response bhej rahe hain, upload background mein chalta rahega
    res.json({
      success: true,
      message: "Selfie upload started...",
      data: { user: formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData) }
    });

    // Step 3: BACKGROUND PROCESSING (No 'await' for the response)
    // Ye line response bhejne ke BAAD execute hogi
    uploadStream(req.file.buffer, {
      folder: `mafs/users/${userId}/kyc`,
      transformation: [{ width: 800, height: 800, crop: "fill", quality: "auto:best" }]
    }).then(async (result) => {
      await Profile.updateOne(
        { userId },
        { 
          $set: { 
            "verification.selfieUrl": result.secure_url, 
            "verification.status": "pending" 
          } 
        }
      );
      await cache.del(`profile:status:${userId}`);
      console.log(`Selfie processed for ${userId}`);
    }).catch(err => console.error("Background Upload Error:", err));

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, message: "Server Error" });
  }
};


module.exports.uploadIDDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const frontFile = req.files?.front?.[0];

    // Basic Validation - Ye turant check hoga
    if (!frontFile) {
      return res.status(400).json({ success: false, message: "Document front image is required" });
    }

    // 1. Parallel Context Fetching (Milli-seconds)
    const data = await getFullUserData(userId);
    if (!data.profile) return res.status(404).json({ success: false, message: "Profile not found" });

    // 2. IMMEDIATE RESPONSE
    // Frontend ko data turant mil jayega, loading spinner hat jayega
    res.json({
      success: true,
      message: "ID upload started. We will notify you once verified.",
      data: { 
        user: formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData) 
      }
    });

    // 3. BACKGROUND PROCESSING (Network I/O)
    // Cloudinary upload aur DB update response ke BAAD honge
    (async () => {
      try {
        const result = await uploadStream(frontFile.buffer, {
          folder: `mafs/users/${userId}/kyc`,
          transformation: [{ width: 1200, height: 800, crop: "limit", quality: "auto:best" }]
        });


        // Atomic update taaki pre-save hook skip ho aur speed mile
        const updateFields = {
          "verification.docUrl": result.secure_url,
          "onboardingProgress.idDocumentUploaded": true
        };

        // Agar selfie pehle se hai, toh status pending kar do
        if (data.profile.verification?.selfieUrl) {
          updateFields["verification.status"] = "pending";
        }

        await Profile.updateOne({ userId }, { $set: updateFields });
        await cache.del(`profile:status:${userId}`);
        
        console.log(`ID Document processed in background for: ${userId}`);
      } catch (bgError) {
        console.error("ID Upload Background Error:", bgError);
      }
    })();

  } catch (err) {
    console.error("ID Upload Controller Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to initiate ID upload" });
    }
  }
};


exports.getVerificationStatus = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).select("verification").lean();
    if (!profile?.verification) {
      return res.json({ success: true, data: { status: "not_started", selfieUploaded: false, documentUploaded: false, message: "Verification not started" } });
    }

    const { status, selfieUrl, docUrl, rejectionReason } = profile.verification;
    let message = status === "pending" ? "Your verification is under review" :
      status === "approved" ? "Your profile has been verified" :
        status === "rejected" ? "Your verification was rejected" : "Verification not started";

    res.json({
      success: true,
      data: { status, selfieUploaded: !!selfieUrl, documentUploaded: !!docUrl, rejectionReason: status === "rejected" ? rejectionReason || "Failed" : null, message }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch status" });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { latitude, longitude, city, state, country, full_address } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ success: false, message: "Valid coordinates required" });

    let profile = await getOrCreateProfile(userId);
    profile.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
      city: city || "", state: state || "", country: country || "", full_address: full_address || ""
    };

    await profile.save();
    const [data] = await Promise.all([getFullUserData(userId, profile), clearProfileCache(userId)]);

    res.json({
      success: true,
      message: "Location updated successfully",
      data: { user: formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `profile:status:${userId}`;

    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const data = await getFullUserData(userId);
    const formatted = formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData);

    await cache.set(cacheKey, JSON.stringify(formatted), { EX: 30 });
    res.json({ success: true, data: formatted, cached: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const Swipe = require("../matches/swipe/swipe.model");
const Match = require("../matches/swipe/swipe.model");

exports.getUserProfile = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const viewerId = req.user;

    // 1️⃣ Parallel Fetching: Sabse fast tareeka
    const [
      viewerProfile,   // Viewer ke coordinates ke liye
      targetProfile,   // Target ka pura data
      swipeAction,     // Kya maine ise like/superlike kiya?
      blockStatus,     // Blocked toh nahi hai?
      matchRecord,     // Kya hum match hain?
      isBoosted        // Kya target boosted hai (Redis)
    ] = await Promise.all([
      Profile.findOne({ userId: viewerId }).select("location").lean(),
      Profile.findOne({ userId: targetUserId }).lean(),
      Swipe.findOne({ swiperId: viewerId, targetId: targetUserId }).lean(),
      Block.findOne({ 
        $or: [
          { blockerId: viewerId, blockedId: targetUserId }, 
          { blockerId: targetUserId, blockedId: viewerId }
        ] 
      }).lean(),
      Match.findOne({ users: { $all: [viewerId, targetUserId] } }).lean(),
      redis.get(`boost:${targetUserId}`) 
    ]);

    // 2️⃣ Edge Case Handlers
    if (!targetProfile) return res.status(404).json({ success: false, message: "Profile not found" });
    if (blockStatus) return res.status(403).json({ success: false, message: "Profile unavailable" });

    
    const formattedData = await formatPublictargetProfile(
      viewerProfile, 
      targetProfile, 
      swipeAction, 
      matchRecord, 
      isBoosted
    );

    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ success: false, message: "Failed to load profile details" });
  }
};


exports.updateDiscoveryFilters = async (req, res) => {
  try {
    const userId = req.user._id;
    const { discoveryFilters } = req.body;
    let profile = await Profile.findOne({ userId });

    if (discoveryFilters) {
      if (discoveryFilters.interests) profile.discovery.preferredInterests = discoveryFilters.interests;
      if (discoveryFilters.relationshipGoal) profile.discovery.filterRelationshipGoal = discoveryFilters.relationshipGoal;
      if (discoveryFilters.ageRange) profile.discovery.ageRange = discoveryFilters.ageRange;
      if (discoveryFilters.advanced) {
        profile.discovery.advancedFilters = { ...profile.discovery.advancedFilters, ...discoveryFilters.advanced };
      }
    }

    await profile.save();
    if (redis) await redis.del(`feed:${userId.toString()}`);


    return res.json({
      success: true,
      message: "Filters applied! Feed is refreshing.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.updateVisibility = async (req, res) => {
  try {
    const userId = req.user._id;
    const { globalVisibility } = req.body;
    const allowed = ["everyone", "matches_only", "nobody"];
    if (!allowed.includes(globalVisibility)) return res.status(400).json({ success: false, message: "Invalid value" });

    const isDisc = globalVisibility !== "nobody";
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: { "discovery.globalVisibility": globalVisibility, isDiscoverable: isDisc, canAccessSwipe: isDisc, lastProfileUpdate: new Date() } },
      { new: true }
    ).lean();

    if (redis) await redis.del(`feed:${userId.toString()}`);

    res.json({
      success: true,
      message: "Visibility updated successfully",
      data: { globalVisibility: profile.discovery.globalVisibility, isDiscoverable: profile.isDiscoverable, canAccessSwipe: profile.canAccessSwipe }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};