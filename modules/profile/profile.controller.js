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
const { buildOnboardingResponse } = require("../../common/utils/onBoardingSteps");
const getFormattedUser = require("../../common/utils/getFormattedUser");

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
      onboardingStartedAt: new Date()
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

    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    if (updateData.profile) {
      const p = updateData.profile;
      const basicFields = ['nickname', 'dob', 'gender', 'height', 'about', 'jobTitle', 'company', 'school', 'pronouns', 'weight'];
      basicFields.forEach(field => { if (p[field] !== undefined) profile[field] = p[field]; });

      // if (p.nickname) {
      //   const existing = await Profile.findOne({ nickname: p.nickname, userId: { $ne: userId } }).lean();
      //   if (existing) return res.status(400).json({ success: false, message: "Nickname taken" });
      // }

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
          max: disc.ageRange.max || profile.discovery.ageRange.max
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
      data: {
        user: await formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData, req),

        // onboarding: buildOnboardingResponse(req)
      }
    });
  } catch (err) {
    console.error("Update Error:", err);
    if (err.name === 'ValidationError') {
      // Mongoose saare errors ka object deta hai, humein pehla message chahiye
      const message = Object.values(err.errors).map(val => val.message)[0];

      return res.status(400).json({
        success: false,
        message: message // Ye bhejega: "Woman is not a valid gender option"
      });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const data = await getFullUserData(req.user._id);
    if (!data.profile) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: { user: await formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData, req) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

exports.uploadPhotos = async (req, res) => {
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

    //  if (!profile.onboarding.isComplete) {
    //   const { nextstep, currentScreenSlug } = req.body;
    //   profile.onboarding.nextstep = nextstep;
    //   profile.onboarding.currentScreenSlug = currentScreenSlug;
    //   profile.onboarding.updatedAt = new Date();
    // }


    await profile.save();
    const [data] = await Promise.all([getFullUserData(userId, profile), clearProfileCache(userId)]);

    res.json({
      success: true,
      message: `${newPhotosResults.length} photo uploaded successfully`,
      data: {
        user: await formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData, req),
        // onboarding: buildOnboardingResponse(req)

      }
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
      data: { user: await formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData, req) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reorderPhotos = async (req, res) => {
  try {
    const userId = req.user._id;
    const { photoId, toPosition } = req.body;

    // ✅ 1. Validation
    if (!photoId || !toPosition) {
      return res.status(400).json({
        success: false,
        message: "photoId and toPosition are required",
      });
    }

    const cleanedPhotoId = String(photoId).trim();
    const position = parseInt(toPosition);

    // ✅ 2. Position valid hai ya nahi
    if (isNaN(position) || position < 0) {
      return res.status(400).json({
        success: false,
        message: "toPosition must be a number >= 0",
      });
    }

    // ✅ 3. Profile find karo
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    // ✅ 4. Position photos count se zyada toh nahi
    if (position > profile.photos.length) {
      return res.status(400).json({
        success: false,
        message: `toPosition cannot be greater than ${profile.photos.length}`,
      });
    }

    // ✅ 5. Photo find karo — current index nikalo
    const currentIndex = profile.photos.findIndex(
      (p) => p.publicId.toString() === cleanedPhotoId
    );

    if (currentIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Photo not found in profile",
      });
    }

    const newIndex = position - 1; // position 1 = index 0

    // ✅ 6. Same position pe hai toh kuch mat karo
    if (currentIndex === newIndex) {
      return res.status(400).json({
        success: false,
        message: "Photo is already at this position",
      });
    }

    // ✅ 7. INSERT LOGIC — NIKALO aur DAALO
    const photosArray = [...profile.photos];
    const [movedPhoto] = photosArray.splice(currentIndex, 1); // NIKALO
    photosArray.splice(newIndex, 0, movedPhoto);               // DAALO

    // ✅ 8. Order aur isPrimary update karo
    const updatedPhotos = photosArray.map((photo, index) => ({
      ...photo.toObject(),
      order: index + 1,
      isPrimary: index === 0,
    }));

    profile.photos = updatedPhotos;
    await profile.save();

    // ✅ 9. Response
    const [data] = await Promise.all([
      getFullUserData(userId, profile),
      clearProfileCache(userId),
    ]);

    return res.json({
      success: true,
      message: `Photo moved to position ${position}`,
      data: {
        user: await formatProfileResponse(
          data.user,
          profile,
          data.blockedContacts,
          data.blockedUser,
          data.subData,
          req
        ),
      },
    });
  } catch (err) {
    console.error("reorderPhotos error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// exports.reorderPhotos = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { photoIds } = req.body;

//     // ✅ 1. Basic validation
//     if (!Array.isArray(photoIds) || photoIds.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "photoIds array is required",
//       });
//     }

//     // ✅ 2. Ensure all IDs are strings
//     const cleanedIds = photoIds.map((id) => String(id).trim());

//     // ✅ 3. Check for duplicates
//     const uniqueIds = [...new Set(cleanedIds)];
//     if (uniqueIds.length !== cleanedIds.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Duplicate photoIds are not allowed",
//       });
//     }

//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         message: "Profile not found",
//       });
//     }

//     // ✅ 4. Photo count must match (no silent deletion)
//     if (uniqueIds.length !== profile.photos.length) {
//       return res.status(400).json({
//         success: false,
//         message: `Expected ${profile.photos.length} photoIds, got ${uniqueIds.length}`,
//       });
//     }

//     // ✅ 5. Build lookup map
//     const photoMap = new Map();
//     profile.photos.forEach((photo) => {
//       photoMap.set(photo.publicId.toString(), photo);
//     });

//     // ✅ 6. Validate all IDs exist before reordering
//     const invalidIds = uniqueIds.filter((id) => !photoMap.has(id));
//     if (invalidIds.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid photoIds: ${invalidIds.join(", ")}`,
//       });
//     }

//     // ✅ 7. Reorder
//     const reorderedPhotos = uniqueIds.map((id, index) => ({
//       ...photoMap.get(id).toObject(),
//       order: index + 1,
//       isPrimary: index === 0,
//     }));

//     profile.photos = reorderedPhotos;
//     await profile.save();

//     // ✅ 8. Response
//     const [data] = await Promise.all([
//       getFullUserData(userId, profile),
//       clearProfileCache(userId),
//     ]);

//     return res.json({
//       success: true,
//       message: "Photos reordered successfully",
//       data: {
//         user: await formatProfileResponse(
//           data.user,
//           profile,
//           data.blockedContacts,
//           data.blockedUser,
//           data.subData,
//           req
//         ),
//       },
//     });
//   } catch (err) {
//     console.error("reorderPhotos error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong",
//     });
//   }
// };



// exports.reorderPhotos = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { photoIds } = req.body;
//     if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ success: false, message: "photoIds array is required" });

//     const profile = await Profile.findOne({ userId });
//     if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
//     // if (photoIds.length !== profile.photos.length) return res.status(400).json({ success: false, message: "Photo count mismatch" });

//     const photoMap = new Map();
//     profile.photos.forEach(photo => photoMap.set(photo.publicId.toString(), photo));

//     const reorderedPhotos = photoIds.map((id, index) => {
//       const photo = photoMap.get(id.trim());
//       if (!photo) throw new Error(`Invalid photoId: ${id}`);
//       return { ...photo.toObject(), order: index + 1, isPrimary: index === 0 };
//     });

//     profile.photos = reorderedPhotos;
//     await profile.save();
//     const [data] = await Promise.all([getFullUserData(userId, profile), clearProfileCache(userId)]);

//     res.json({
//       success: true,
//       message: "Photos reordered successfully",
//       data: { user: await formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData,req) }
//     });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

// Function name vahi hai, bas logic change kiya hai file handle karne ka
// module.exports.uploadSelfie = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     // Ab file buffer nahi, direct URL aayega frontend se
//     const { selfieUrl } = req.body; 

//     if (!selfieUrl) return res.status(400).json({ success: false, message: "Selfie URL required" });

//     const profile = await getOrCreateProfile(userId);
//     if (profile.verification?.status === "approved") return res.status(400).json({ success: false, message: "Already approved" });

//     // Parallel processing: DB updates
//     const [data] = await Promise.all([
//       getFullUserData(userId, profile), // Metadata fetch
//       Profile.updateOne({ userId }, { 
//         $set: { 
//           "verification.selfieUrl": selfieUrl, 
//           "verification.status": "pending" 
//         } 
//       })
//     ]);

//     await clearProfileCache(userId);

//     res.json({
//       success: true,
//       message: "Selfie verified and updated",
//       data: { user: formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData) }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Sync failed" });
//   }
// };

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
      data: {
        user: await formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData, req),
        // onboarding: buildOnboardingResponse(req)
      }
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
        user: await formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData, req),
        // onboarding: buildOnboardingResponse(req)
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
// exports.uploadIDDocument = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const frontFile = req.files?.front?.[0];
//     if (!frontFile) return res.status(400).json({ success: false, message: "Document front image is required" });

//     const profile = await Profile.findOne({ userId });
//     if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

//     const [uploadResult, data] = await Promise.all([
//       uploadStream(frontFile.buffer, {
//         folder: `mafs/users/${userId}/kyc`,
//         transformation: [{ width: 1200, height: 800, crop: "limit", quality: "auto:best" }]
//       }),
//       getFullUserData(userId, profile)
//     ]);

//     if (!profile.verification) profile.verification = {};
//     profile.verification.docUrl = uploadResult.secure_url;
//     profile.verification.status = profile.verification.selfieUrl ? "pending" : "not_started";

//     await profile.save();
//     await clearProfileCache(userId);

//     res.json({
//       success: true,
//       message: "ID document uploaded successfully.",
//       data: { user: formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData) }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to upload ID document" });
//   }
// };

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

    // Extra safety check (validation already handles this, but just in case)
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates required (latitude and longitude)"
      });
    }

    // Sanity check — catch swapped coordinates
    if (Math.abs(latitude) > 90) {
      return res.status(400).json({
        success: false,
        message: `Invalid latitude: ${latitude}. Latitude must be between -90 and 90. Did you swap latitude and longitude?`
      });
    }

    if (Math.abs(longitude) > 180) {
      return res.status(400).json({
        success: false,
        message: `Invalid longitude: ${longitude}. Longitude must be between -180 and 180.`
      });
    }

    let profile = await getOrCreateProfile(userId);

    // MongoDB GeoJSON format: [longitude, latitude]
    profile.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
      city: city || "",
      state: state || "",
      country: country || "",
      full_address: full_address || ""
    };

    await profile.save();

    const [data] = await Promise.all([
      getFullUserData(userId, profile),
      clearProfileCache(userId)
    ]);

    res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        user: await formatProfileResponse(
          data.user,
          profile,
          data.blockedContacts,
          data.blockedUser,
          data.subData,
          req
        )
      }
    });
  } catch (err) {
    console.error("Location Update Error:", err);

    // Parse MongoDB geo errors into readable messages
    let message = "Failed to update location. Please try again.";

    if (err.message && err.message.includes("geo keys")) {
      message =
        "Invalid coordinates detected. Latitude must be between -90 and 90, " +
        "and Longitude must be between -180 and 180. " +
        "Please make sure you haven't swapped latitude and longitude.";
    } else if (err.name === "ValidationError") {
      // Mongoose validation error
      const firstError = Object.values(err.errors)[0];
      message = firstError?.message || "Invalid profile data provided.";
    } else if (err.code === 16755) {
      // MongoDB GeoJSON validation error code
      message =
        "Invalid geographic coordinates. Please check your latitude and longitude values.";
    }

    res.status(400).json({
      success: false,
      message
    });
  }
};

// exports.updateLocation = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { latitude, longitude, city, state, country, full_address } = req.body;
//     if (!latitude || !longitude) return res.status(400).json({ success: false, message: "Valid coordinates required" });

//     let profile = await getOrCreateProfile(userId);
//     profile.location = {
//       type: "Point",
//       coordinates: [Number(longitude), Number(latitude)],
//       city: city || "", state: state || "", country: country || "", full_address: full_address || ""
//     };

//     await profile.save();
//     const [data] = await Promise.all([getFullUserData(userId, profile), clearProfileCache(userId)]);

//     res.json({
//       success: true,
//       message: "Location updated successfully",
//       data: { user: await formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData, req) }
//     });
//   } catch (err) {
//     console.error("Location Update Error:", err);
//     res.status(400).json({ success: false, message: "Invalid location data or coordinates out of bounds" });
//   }
// };

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `profile:status:${userId}`;

    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const data = await getFullUserData(userId);
    const formatted = await formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData, req);

    await cache.set(cacheKey, JSON.stringify(formatted), { EX: 30 });
    res.json({ success: true, data: formatted, cached: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const Swipe = require("../matches/swipe/swipe.model");
const { Match } = require("../matches/swipe/swipe.model");

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

// exports.getUserProfile = async (req, res) => {
//   try {
//     const { userId: targetUserId } = req.params;
//     const viewer = req.user;

//     const [targetProfile, swipeAction, blockStatus] = await Promise.all([
//       Profile.findOne({ userId: targetUserId }).lean(),
//       swipeModel.findOne({ swiperId: viewer._id, targetId: targetUserId }).lean(),
//       Block.findOne({ $or: [{ blockerId: viewer._id, blockedId: targetUserId }, { blockerId: targetUserId, blockedId: viewer._id }] }).lean()
//     ]);

//     if (!targetProfile) return res.status(404).json({ success: false, message: "User profile not found" });
//     if (blockStatus) return res.status(403).json({ success: false, message: "Profile is private or unavailable" });

//     const formattedData = await formatPublicProfile(viewer, targetProfile, swipeAction);
//     res.json({ success: true, data: formattedData });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to load profile details" });
//   }
// };


exports.resetDiscoveryFilters = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found."
      });
    }

    profile.discovery.preferredInterests = [];
    profile.discovery.filterRelationshipGoal = null;
    // profile.discovery.showMeGender = "";
    profile.discovery.ageRange = { min: 18, max: 60 };
    profile.discovery.advancedFilters = {
      zodiac: null,
      education: null,
      familyPlans: null,
      personalityType: null,
      communicationStyle: null,
      loveStyle: null,
      pets: null,
      drinking: null,
      smoking: null,
      workout: null,
      dietary: null,
      socialMedia: null,
      sleeping: null
    };

    await profile.save();

    if (redis) await redis.del(`feed:${userId.toString()}`);

    const formattedUser = await getFormattedUser(userId, req);

    return res.json({
      success: true,
      message: "All discovery filters have been reset to defaults.",
      data: { user: formattedUser }
    });
  } catch (err) {
    console.log("RESET ERROR:", err.message); // ← ye add karo terminal mein dekhne ke liye
    return res.status(500).json({
      success: false,
      message: "Something went wrong while resetting filters."
    });
  }
};




exports.updateDiscoveryFilters = async (req, res) => {
  try {
    const userId = req.user._id;
    const { discoveryFilters } = req.body;
    let profile = await Profile.findOne({ userId });
console.log(discoveryFilters.distanceRange,"dis")
    if (discoveryFilters) {
      if (discoveryFilters.interests) profile.discovery.preferredInterests = discoveryFilters.interests;
      if (discoveryFilters.relationshipGoal) profile.discovery.filterRelationshipGoal = discoveryFilters.relationshipGoal;
      if (discoveryFilters.ageRange) profile.discovery.ageRange = discoveryFilters.ageRange;
      if(discoveryFilters.distanceRange) profile.discovery.distanceRange = discoveryFilters.distanceRange
      if (discoveryFilters.advanced) {
        profile.discovery.advancedFilters = { ...profile.discovery.advancedFilters, ...discoveryFilters.advanced };
      };
      if (discoveryFilters.showMeGender) profile.discovery.showMeGender = discoveryFilters.showMeGender
    }

    await profile.save();

    if (redis) await redis.del(`feed:${userId.toString()}`);

    const formattedUser = await getFormattedUser(userId, req);

    return res.json({
      success: true, message: "Filters applied! Feed is refreshing.", data: {
        user: formattedUser
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDiscoveryPreference = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).select('preferences discoveryFilters').lean();
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, data: { preferences: profile.preferences, discoveryFilters: profile.discoveryFilters } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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


// const cloudinary = require('cloudinary').v2;
// const mongoose = require('mongoose');

// exports.getUploadSignature = async (req, res) => {
//   try {
//     // 1. Check karein ki user authenticated hai aur ID valid hai
//     if (!req.user || !req.user._id) {
//       retrn res.status(401).json({ success: false, message: "User not authenticated" });
//     }

//     const userId = req.user._id.toString();

//     // 2. Mongoose ID check (Safety layer)
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ success: false, message: "Invalid ID format" });
//     }

//     const timestamp = Math.round(new Date().getTime() / 1000);
//     const folder = `mafs/users/${userId}/photos`;

//     // 3. Signature generate karna
//     const signature = cloudinary.utils.api_sign_request(
//       { timestamp, folder },
//       process.env.CLOUDINARY_API_SECRET
//     );

//     res.json({
//       success: true,
//       data: {
//         signature,
//         timestamp,
//         cloudName: process.env.CLOUDINARY_CLOUD_NAME,
//         apiKey: process.env.CLOUDINARY_API_KEY,
//         folder,
//         uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };



const mongoose = require('mongoose');

exports.resetTestData = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userObjectId = mongoose.Types.ObjectId.isValid(adminId)
      ? new mongoose.Types.ObjectId(adminId)
      : adminId;

    // ✅ DELETE MATCHES WHERE ADMIN IS PART OF MATCH
    const matchResult = await Match.deleteMany({
      users: userObjectId // array contains adminId
    });

    // ✅ DELETE SWIPES WHERE ADMIN IS INVOLVED
    const swipeResult = await Swipe.deleteMany({
      $or: [
        { swiperId: adminId },
        { targetId: adminId }
      ]
    });

    res.json({
      success: true,
      message: "Test data reset successfully",
      data: {
        matchesDeleted: matchResult.deletedCount,
        swipesDeleted: swipeResult.deletedCount
      }
    });

  } catch (error) {
    console.error("Error resetting test data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset test data",
      error: error.message
    });
  }
};