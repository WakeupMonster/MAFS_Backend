/* eslint-disable no-unused-vars */
// const service = require("./profile.service");

// module.exports.updateBasicInfo = async (req, res) => {
//   const result = await service.updateBasicInfo(req.user._id, req.body);
//   return res.json({ success: true, data: result });
// };

// module.exports.updateLocation = async (req, res) => {
//   const result = await service.updateLocation(req.user._id, req.body);
//   return res.json({ success: true, data: result });
// };

// module.exports.updateInterests = async (req, res) => {
//   const result = await service.updateInterests(req.user._id, req.body);
//   return res.json({ success: true, data: result });
// };

// module.exports.updatePreferences = async (req, res) => {
//   const result = await service.updatePreferences(req.user._id, req.body);
//   return res.json({ success: true, data: result });
// };

// module.exports.uploadPhoto = async (req, res) => {
//   const result = await service.uploadPhoto(req.user._id, req.body);
//   return res.json({ success: true, data: result });
// };

// module.exports.markProfileCompleted = async (req, res) => {
//   const result = await service.markProfileCompleted(req.user._id);
//   return res.json({ success: true, data: result });
// };


// src/modules/profile/profile.controller.js
const Profile = require("./profile.model");
const cache = require("../../config/cache");
const { updateProfileProgress } = require("./profileProgress.util");
const { upload: uploadMiddleware, handleMulterError } = require('../upload/upload.middleware');
const { uploadStream, destroy } = require('../upload/cloudinary.service');

/**
 * Helper: ensure a profile doc exists for this user (creates empty doc if missing)
 */
async function ensureProfile(userId) {
  // findOneAndUpdate with upsert ensures creation (and returns doc)
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true }
  );
  return profile;
}

/**
 * Allowed fields for /basic (strict)
 */

const BASIC_ALLOWED = ["fullName", "nickname", "bio", "dob", "gender"];

module.exports.updateBasicInfo = async (req, res) => {
  try {
    const userId = req.user._id;

    // ensure profile exists
    await ensureProfile(userId);

    // build update data only from allowed fields
    const update = {};
    BASIC_ALLOWED.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided" });
    }

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, lean : true } // return updated doc
    );  

     // Determine if basic step is complete
    const basicOk = Boolean(profile.fullName && profile.dob && profile.gender);
    await updateProfileProgress(userId, { basicInfo: basicOk });

    // invalidate cache
    await cache.del(`profile:status:${userId}`);
    await cache.del(`profile:${userId}`);

    return res.json({ success: true, data: profile, progress: profile.onboardingProgress });
  } catch (err) {
    console.error("updateBasicInfo error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { lat, lon, city, country } = req.body;

    await ensureProfile(userId);

    const location = {
      type: "Point",
      coordinates: [Number(lon), Number(lat)]
    };
    if (city) location.city = city;
    if (country) location.country = country;

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: { location,"onboardingProgress.updateLocation": true } },
      { new: true, lean: true }
    );
    const locOk = Boolean(location.coordinates && location.coordinates.length === 2 && location.coordinates[0] !== 0 && location.coordinates[1] !== 0);
    await updateProfileProgress(userId, { location: locOk });

    await cache.del(`profile:status:${userId}`);
    await cache.del(`profile:${userId}`);

    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("updateLocation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.updateInterests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { add, remove, replace } = req.body;

    // Profile ensure
    await ensureProfile(userId);

    // CASE 1 → Replace all interests
    if (Array.isArray(replace)) {
      const profile = await Profile.findOneAndUpdate(
        { userId },
        { $set: { interests: replace } },
        { new: true, lean: true }
      );
      return res.json({ success: true, data: profile.interests });
    }

    // CASE 2 → Add new interests
    if (Array.isArray(add) && add.length > 0) {
      await Profile.updateOne(
        { userId },
        { $addToSet: { interests: { $each: add } } }  // atomic + no duplicates
      );
    }

    // CASE 3 → Remove interests
    if (Array.isArray(remove) && remove.length > 0) {
      await Profile.updateOne(
        { userId },
        { $pull: { interests: { $in: remove } } } // remove many
      );
    }

    // Return final result with 1 optimized read
    const finalProfile = await Profile.findOne({ userId }).select("interests").lean();
    return res.json({ success: true, data: finalProfile.interests });

  } catch (err) {
    console.error("updateInterests error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// module.exports.updateInterests = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { interests } = req.body;

//     if (!Array.isArray(interests) || interests.length === 0) {
//       return res.status(400).json({ success: false, message: "interests must be a non-empty array" });
//     }

//     await ensureProfile(userId);

//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $set: { interests } },
//       { new: true, lean : true }
//     );
//     const ok = Array.isArray(profile.interests) && profile.interests.length > 0;
//     await updateProfileProgress(userId, { interestsSelected: ok });
//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);
//     return res.json({ success: true, data: profile });
//     // return res.json({ success: true, data: profile });
//   } catch (err) {
//     console.error("updateInterests error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

module.exports.updaterelationshipGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { relationgoal } = req.body;

    if (!Array.isArray(relationgoal) || relationgoal.length === 0) {
      return res.status(400).json({ success: false, message: "relationgoal must be a non-empty array" });
    }

    await ensureProfile(userId);

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: { relationgoal } },
      { new: true, lean : true }
    );
    const ok = Array.isArray(profile.relationgoal) && profile.relationgoal.length > 0;
    await updateProfileProgress(userId, { relationgoalSelected: ok });
    await cache.del(`profile:status:${userId}`);
    await cache.del(`profile:${userId}`);
    return res.json({ success: true, data: profile });
    // return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("relationgoal error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


module.exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ageRange, distanceRange, genderPreference } = req.body;

    // Basic validation (controller-level safety)
    const update = {};
    if (ageRange) {
      if (typeof ageRange.min !== "number" || typeof ageRange.max !== "number") {
        return res.status(400).json({ success: false, message: "ageRange must contain min and max numbers" });
      }
      update["preferences.ageRange"] = ageRange;
    }
    if (distanceRange !== undefined) update["preferences.distanceRange"] = Number(distanceRange);
    if (genderPreference !== undefined) {
      if (!Array.isArray(genderPreference)) {
        return res.status(400).json({ success: false, message: "genderPreference must be an array" });
      }
      update["preferences.genderPreference"] = genderPreference;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No preferences provided" });
    }

    await ensureProfile(userId);

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, lean : true }
    );

     const prefsOk = (profile.preferences && ((profile.preferences.genderPreference && profile.preferences.genderPreference.length > 0) || (profile.preferences.ageRange && profile.preferences.ageRange.min)));
    await updateProfileProgress(userId, { preferencesSet: Boolean(prefsOk) });

    await cache.del(`profile:status:${userId}`);
    await cache.del(`profile:${userId}`);
    return res.json({ success: true, data: profile });

  } catch (err) {
    console.error("updatePreferences error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update the uploadPhoto function
module.exports.uploadPhoto = 
  // uploadMiddleware.array('photos', 6), // Max 6 files
  // handleMulterError,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No files uploaded' 
        });
      }

      // Check total photos won't exceed 6
      const profile = await Profile.findOne({ userId });
      const currentPhotoCount = profile?.photos?.length || 0;
      
      if (currentPhotoCount + files.length > 6) {
        return res.status(400).json({
          success: false,
          message: `Maximum 6 photos allowed. You already have ${currentPhotoCount} photos.`
        });
      }

      // Process each file
      const uploadPromises = files.map(async (file) => {
        const result = await uploadStream(file.buffer, {
          transformation: [
            { width: 1000, height: 1000, crop: 'limit', quality: 'auto' }
          ]
        });

        return {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          isPrimary: false,
          order: (profile?.photos?.length || 0) + 1
        };
      });

      const newPhotos = await Promise.all(uploadPromises);

      // Update profile with new photos
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        { $push: { photos: { $each: newPhotos } } },
        { new: true, upsert: true }
      );

      // Update onboarding progress
      const photosOk = updatedProfile.photos.length > 0;
      await updateProfileProgress(userId, { photosUploaded: photosOk });

      // Clear cache
      await cache.del(`profile:status:${userId}`);
      await cache.del(`profile:${userId}`);

      return res.json({ 
        success: true, 
        data: updatedProfile,
        message: 'Photos uploaded successfully'
      });

    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error uploading photos',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  };
// Update deletePhoto function
module.exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'publicId is required' 
      });
    }

    // Find the profile and photo
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile not found' 
      });
    }

    const photoIndex = profile.photos.findIndex(p => p.publicId === publicId);
    if (photoIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }

    // Delete from Cloudinary
    await destroy(publicId);

    // Remove from profile
    profile.photos.splice(photoIndex, 1);
    await profile.save();

    // Update onboarding progress if no photos left
    const photosOk = profile.photos.length > 0;
    await updateProfileProgress(userId, { photosUploaded: photosOk });

    // Clear cache
    await cache.del(`profile:status:${userId}`);
    await cache.del(`profile:${userId}`);

    return res.json({ 
      success: true, 
      message: 'Photo deleted successfully' 
    });

  } catch (err) {
    console.error('Delete photo error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Error deleting photo',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};



// module.exports.uploadPhoto = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { url, isPrimary = false, order = 0 } = req.body;

//     if (!url) return res.status(400).json({ success: false, message: "url is required" });

//     await ensureProfile(userId);

//     // If isPrimary true, unset previous primary
//     if (isPrimary) {
//       await Profile.updateOne(
//         { userId },
//         { $set: { "photos.$[p].isPrimary": false } },
//         { arrayFilters: [{ "p.isPrimary": true }] }
//       ).catch(() => {}); // ignore if none
//     }

//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $push: { photos: { url, isPrimary, order } } },
//       { new: true, upsert: true, lean: true }
//     );
//      const photosOk = Array.isArray(profile.photos) && profile.photos.length > 0;
//     await updateProfileProgress(userId, { photosUploaded: photosOk });

//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);

//     return res.json({ success: true, data: profile });
//   } catch (err) {
//     console.error("uploadPhoto error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
// ``
// module.exports.markProfileCompleted = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }

//     // --- STEP BASED LOGIC ---
//     const step = profile.onboardingProgress;

//     step.basicInfo = Boolean(profile.dob && profile.gender);
//     step.interestsSelected = Array.isArray(profile.interests) && profile.interests.length > 0;
//     step.photosUploaded = Array.isArray(profile.photos) && profile.photos.length > 0;
//     step.kycVerified = profile.isKycVerified === true;
//     step.preferencesSet = profile.preferences && Object.keys(profile.preferences).length > 0;

//     // Update step tracking
//     await profile.save();

//     // --- FINAL COMPLETION CHECK ---
//     const allStepsCompleted =
//       step.basicInfo &&
//       step.interestsSelected &&
//       step.photosUploaded &&
//       step.kycVerified &&
//       step.preferencesSet;

//     if (!allStepsCompleted) {
//       return res.status(400).json({
//         success: false,
//         message: "Profile is not completely ready",
//         progress: step
//       });
//     }

//     // If all steps are done → mark complete
//     profile.isProfileCompleted = true;
//     profile.isOnboardingCompleted = true;
//     profile.profileCompletedAt = new Date();

//     await profile.save();

//     return res.json({
//       success: true,
//       message: "Profile completed successfully",
//       progress: step,
//       data: profile
//     });

//   } catch (err) {
//     console.error("markProfileCompleted error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };





// module.exports.markProfileCompleted = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Optionally validate required fields exist before marking complete
//     const profile = await Profile.findOne({ userId });
//     if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

//     // Example required set - adjust to your rules
//     const requiredOk = profile.dob && profile.gender && profile.interests > 0 && profile.photos && profile.isKycVerified && profile.photos.length > 0 && profile.preferences > 0;
//     if (!requiredOk) {
//       return res.status(400).json({ success: false, message: "Profile not ready to be marked complete" });
//     }

//     const updated = await Profile.findOneAndUpdate(
//       { userId },
//       {
//         $set: {
//           isProfileCompleted: true,
//           isOnboardingCompleted: true,
//           profileCompletedAt: new Date()
//         }
//       },
//       { new: true }
//     );

//     return res.json({ success: true, data: updated });
//   } catch (err) {
//     console.error("markProfileCompleted error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

module.exports.markProfileCompleted = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await Profile.findOne({ userId }).lean();
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    const progress = profile.onboardingProgress || {};
    const allComplete = Boolean(
      progress.basicInfo &&
      progress.updateLocation &&
      progress.interestsSelected &&
      progress.preferencesSet &&
      progress.photosUploaded &&
      progress.kycVerified &&
      progress.phoneVerified &&
      progress.emailVerified 
    );

    if (!allComplete) {
      return res.status(400).json({ success: false, message: "Profile not ready to be marked complete", progress });
    }

    const updated = await Profile.findOneAndUpdate({ userId }, {
      $set: {
        isProfileCompleted: true,
        isOnboardingCompleted: true,
        profileCompletedAt: new Date()
      }
    }, { new: true, lean: true });

    // optional: update userAuth isProfileCompleted too (if you store there)
    // await UserAuth.findByIdAndUpdate(userId, { isProfileCompleted: true });

    await cache.del(`profile:status:${userId}`);
    await cache.del(`profile:${userId}`);

    return res.json({ success: true, message: "Profile completed", data: updated });
  } catch (err) {
    console.error("markProfileCompleted error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    res.json({ success: true, data: profile });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getPublicProfile = async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    const profile = await Profile.findOne(
      { userId: targetUserId, isDiscoverable: true }
    ).select("-preferences");  // hide personal preference data

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found or not discoverable" });
    }

    res.json({ success: true, data: profile });
    
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { order } = req.body;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const updatedPhotos = profile.photos.filter(photo => photo.order !== order);

    // If no photo removed
    if (updatedPhotos.length === profile.photos.length) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    profile.photos = updatedPhotos;
    await profile.save();

    return res.json({ success: true, message: "Photo deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteAllInterests = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    profile.interests = [];
    await profile.save();

    res.json({
      success: true,
      message: "All interests deleted",
      data: profile.interests
    });
  } catch (err) {
    console.error("deleteAllInterests error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteOneInterest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interest } = req.params;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const exists = profile.interests.includes(interest);
    if (!exists) {
      return res.status(404).json({ success: false, message: "Interest not found" });
    }

    profile.interests = profile.interests.filter(i => i !== interest);
    await profile.save();

    res.json({
      success: true,
      message: "Interest removed",
      data: profile.interests
    });
  } catch (err) {
    console.error("deleteOneInterest error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports.addInterests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interests } = req.body;
    if (!Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ success: false, message: "interests must be a non-empty array" });
    }
    await ensureProfile(userId);
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $addToSet: { interests: { $each: interests } } },
      { new: true, upsert: true, lean: true }
    );
    const ok = Array.isArray(profile.interests) && profile.interests.length > 0;
    await updateProfileProgress(userId, { interestsSelected: ok });
    await cache.del(`profile:status:${userId}`);
    await cache.del(`profile:${userId}`);
    return res.json({ success: true, data: profile.interests });
  } catch (err) {
    console.error("addInterests error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// module.exports.addInterests = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { interests } = req.body;

//     if (!Array.isArray(interests) || interests.length === 0) {
//       return res.status(400).json({ success: false, message: "interests must be a non-empty array" });
//     }

//     await ensureProfile(userId);

//     const profile = await Profile.findOne({ userId });

//     const updatedInterests = [...new Set([...profile.interests, ...interests])];

//     profile.interests = updatedInterests;
//     await profile.save();

//     return res.json({ success: true, data: profile.interests });

//   } catch (err) {
//     console.error("addInterests error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


module.exports.addPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { genderPreference } = req.body;

    if (!Array.isArray(genderPreference) || genderPreference.length === 0) {
      return res.status(400).json({ success: false, message: "genderPreference must be a non-empty array" });
    }

    await ensureProfile(userId);

    const profile = await Profile.findOne({ userId });
    
    const updatedGenderPreference = [...new Set([...profile.preferences.genderPreference, ...genderPreference])];

    profile.preferences.genderPreference = updatedGenderPreference;
    await profile.save();

    return res.json({ success: true, data:  profile.preferences.genderPreference });

  } catch (err) {
    console.error("genderPreference error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cacheKey = `profile:status:${userId}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, progress: JSON.parse(cached) });
    }

    const profile = await Profile.findOne({ userId }).lean();
    if (!profile) {
      // If no profile, return defaults
      const defaultProgress = {
        basicInfo: false, location: false, interestsSelected: false,
        preferencesSet: false, photosUploaded: false, kycVerified: false,
        completion: 0
      };
      await cache.set(cacheKey, defaultProgress, { EX: 30 });
      return res.json({ success: true, progress: defaultProgress });
    }

    const progress = profile.onboardingProgress || { completion: 0 };
    await cache.set(cacheKey, progress, { EX: 30 });
    return res.json({ success: true, progress });
  } catch (err) {
    console.error("getStatus error", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};