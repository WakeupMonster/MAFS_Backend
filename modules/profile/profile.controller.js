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
const {
  buildOnboardingResponse,
} = require("../../common/utils/onBoardingSteps");
const getFormattedUser = require("../../common/utils/getFormattedUser");
const { getMasterDataMap } = require("../../common/utils/masterData.util");
const mongoose = require('mongoose');

async function getFullUserData(userId, existingProfile = null) {
  const [user, profile, blockedContacts, blockedUser, subData] =
    await Promise.all([
      User.findById(userId).lean(),
      existingProfile
        ? Promise.resolve(existingProfile)
        : Profile.findOne({ userId }),
      BlockedContact.find({ userId }).lean(),
      Block.find({ blockerId: userId }).lean(),
      UserSubscription.findOne({ userId }),
    ]);

  let finalSub = subData;
  if (!finalSub) {
    finalSub = await UserSubscription.create({ userId });
  } else {
    // Agar lean use karte hain to methods work nahi karte, isliye instance logic check
    if (typeof finalSub.resetIfNeeded === "function") finalSub.resetIfNeeded();
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
      cache.del(`profile:status:${userId}`),
      cache.del(`profile:static:${userId}`),
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

    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });

    if (updateData.profile) {
      const p = updateData.profile;

      // DOB Age validation (18+)
      if (p.dob) {
        const parsedDate = new Date(p.dob).getTime();
        if (!isNaN(parsedDate)) {
          const age = Math.floor((Date.now() - parsedDate) / 31557600000);
          if (age < 18) {
            return res.status(400).json({
              success: false,
              message: "You must be at least 18 years old to use MAFS."
            });
          }
        } else {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Date of Birth format." });
        }
      }

      const basicFields = [
        "nickname",
        "dob",
        "gender",
        "height",
        "about",
        "jobTitle",
        "company",
        "school",
        "pronouns",
        "weight",
        "livingIn",
      ];
      basicFields.forEach((field) => {
        if (p[field] !== undefined) profile[field] = p[field];
      });

      // if (p.nickname) {
      //   const existing = await Profile.findOne({ nickname: p.nickname, userId: { $ne: userId } }).lean();
      //   if (existing) return res.status(400).json({ success: false, message: "Nickname taken" });
      // }
    }

    if (updateData.attributes) {
      const attr = updateData.attributes;
      profile.attributes = profile.attributes || {};
      const traitFields = [
        "zodiac",
        "education",
        "familyPlans",
        "personalityType",
        "communicationStyle",
        "loveStyle",
        "bloodType",
        "covidVaccine",
        "religion",
        "pets",
        "drinking",
        "smoking",
        "workout",
        "dietary",
        "sleeping",
        "socialMedia",
      ];
      traitFields.forEach((field) => {
        if (attr[field] !== undefined) profile.attributes[field] = attr[field];
      });

      const arrayTraits = [
        "languages",
        "interests",
        "music",
        "movies",
        "books",
        "travel",
      ];
      arrayTraits.forEach((field) => {
        if (attr[field] !== undefined)
          profile.attributes[field] = Array.isArray(attr[field])
            ? attr[field]
            : [attr[field]];
      });
    }

    if (updateData.discovery) {
      const disc = updateData.discovery;
      profile.discovery = profile.discovery || {};
      if (disc.distanceRange) {
        if (typeof disc.distanceRange === "object") {
          profile.discovery.distanceRange = disc.distanceRange.max || 50;
        } else {
          profile.discovery.distanceRange = disc.distanceRange;
        }
      }
      if (disc.relationshipGoal)
        profile.discovery.relationshipGoal = disc.relationshipGoal;
      if (disc.globalVisibility)
        profile.discovery.globalVisibility = disc.globalVisibility;
      if (disc.ageRange) {
        profile.discovery.ageRange = {
          min: disc.ageRange.min || profile.discovery.ageRange.min,
          max: disc.ageRange.max || profile.discovery.ageRange.max,
        };
      }
      if (disc.showMeGender)
        profile.discovery.showMeGender = Array.isArray(disc.showMeGender)
          ? disc.showMeGender
          : [disc.showMeGender];
    }

    profile.lastProfileUpdate = new Date();
    await profile.save();

    // Push to auditLogs for User-side Profile Update
    try {
      const userDoc = await User.findById(userId);
      if (userDoc) {
        userDoc.auditLogs.push({
          action: "update_profile",
          reason: "User updated their own profile",
          actedBy: userId,
          actedAt: new Date(),
          details: {
            updatedFields: Object.keys(updateData.profile || {}).concat(
              Object.keys(updateData.attributes || {}),
            ),
          },
        });
        await userDoc.save();
      }
    } catch (auditErr) {
      console.error("Audit log failed for user profile update:", auditErr);
    }

    const data = await getFullUserData(userId, profile);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: await formatProfileResponse(
          data.user,
          profile,
          data.blockedContacts,
          data.blockedUser,
          data.subData,
          req,
        ),

        // onboarding: buildOnboardingResponse(req)
      },
    });

  } catch (err) {
    console.error("Update Error:", err);
    if (err.name === "ValidationError") {
      // Mongoose saare errors ka object deta hai, humein pehla message chahiye
      const message = Object.values(err.errors).map((val) => val.message)[0];

      return res.status(400).json({
        success: false,
        message: message, // Ye bhejega: "Woman is not a valid gender option"
      });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const data = await getFullUserData(req.user._id);
    if (!data.profile)
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      message: "Profile fetched successfully",
      data: { user: await formatProfileResponse(data.user, data.profile, data.blockedContacts, data.blockedUser, data.subData, req) }
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
};

exports.uploadPhotos = async (req, res) => {
  try {
    const userId = req.user._id;
    const files = req.files;
    if (!files || files.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });

    let profile = await getOrCreateProfile(userId);
    if (profile.photos.length + files.length > 6) {
      return res
        .status(400)
        .json({ success: false, message: `Maximum 6 photos allowed.` });
    }

    const uploadPromises = files.map((file) =>
      uploadStream(file.buffer, {
        folder: `mafs/users/${userId}/photos`,
        transformation: [
          { width: 1080, height: 1350, crop: "fill", quality: "auto:good" },
        ],
      }),
    );

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
        isPrimary: profile.photos.length === 0 && index === 0,
      });
    });

    //  if (!profile.onboarding.isComplete) {
    //   const { nextstep, currentScreenSlug } = req.body;
    //   profile.onboarding.nextstep = nextstep;
    //   profile.onboarding.currentScreenSlug = currentScreenSlug;
    //   profile.onboarding.updatedAt = new Date();
    // }

    await profile.save();
    const [data, masterMap] = await Promise.all([
      getFullUserData(userId, profile),
      clearProfileCache(userId),
      getMasterDataMap(),
    ]);

    res.json({
      success: true,
      message: `${newPhotosResults.length} photo uploaded successfully`,
      data: {
        user: await formatProfileResponse(
          data.user,
          profile,
          data.blockedContacts,
          data.blockedUser,
          data.subData,
          req,
          masterMap,
        ),
        // onboarding: buildOnboardingResponse(req)
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to upload photos" });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { publicId } = req.body;
    const profile = await Profile.findOne({ userId });

    const photoIndex = profile?.photos.findIndex(
      (p) => p.publicId === publicId,
    );
    if (photoIndex === -1 || !profile)
      return res
        .status(404)
        .json({ success: false, message: "Photo not found" });

    await destroy(publicId);
    profile.photos.splice(photoIndex, 1);
    profile.photos.forEach((photo, index) => {
      photo.order = index + 1;
      photo.isPrimary = index === 0;
    });

    await profile.save();
    const data = await getFullUserData(userId, profile);
    await clearProfileCache(userId);

    res.json({
      success: true,
      message: "photo deleted successfully",
      data: {
        user: await formatProfileResponse(
          data.user,
          profile,
          data.blockedContacts,
          data.blockedUser,
          data.subData,
          req,
        ),
      },
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
      (p) => p.publicId.toString() === cleanedPhotoId,
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
    photosArray.splice(newIndex, 0, movedPhoto); // DAALO

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
          req,
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

exports.resetDiscoveryFilters = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await Profile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    profile.discovery = {
      distanceRange: 50,
      ageRange: { min: 18, max: 60 },
      showMeGender: [],
      relationshipGoal: null,
      globalVisibility: "everyone",
      preferredInterests: [],
      advancedFilters: {}
    };

    await profile.save();
    await clearProfileCache(userId);

    const data = await getFullUserData(userId, profile);
    res.json({
      success: true,
      message: "Discovery filters reset successfully",
      data: { user: await formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData, req) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reset filters" });
  }
};

exports.updateDiscoveryFilters = async (req, res) => {
  try {
    const userId = req.user._id;
    const { discoveryFilters } = req.body;
    const profile = await Profile.findOne({ userId });

    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    if (discoveryFilters.relationshipGoal) profile.discovery.relationshipGoal = discoveryFilters.relationshipGoal;
    if (discoveryFilters.interests) profile.discovery.preferredInterests = discoveryFilters.interests;
    if (discoveryFilters.showMeGender) profile.discovery.showMeGender = discoveryFilters.showMeGender;
    if (discoveryFilters.ageRange) profile.discovery.ageRange = discoveryFilters.ageRange;
    if (discoveryFilters.distanceRange) profile.discovery.distanceRange = discoveryFilters.distanceRange;

    if (discoveryFilters.advanced) {
      profile.discovery.advancedFilters = {
        ...profile.discovery.advancedFilters,
        ...discoveryFilters.advanced
      };
    }

    await profile.save();
    await clearProfileCache(userId);

    const data = await getFullUserData(userId, profile);
    res.json({
      success: true,
      message: "Discovery filters updated",
      data: { user: await formatProfileResponse(data.user, profile, data.blockedContacts, data.blockedUser, data.subData, req) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update filters" });
  }
};

exports.uploadSelfie = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!req.file) return res.status(400).json({ success: false, message: "No selfie file uploaded" });

    const result = await uploadStream(req.file.buffer, {
      folder: `mafs/users/${userId}/kyc`,
      transformation: [{ width: 600, height: 600, crop: "fill" }]
    });

    const profile = await getOrCreateProfile(userId);
    profile.verification.selfieUrl = result.secure_url;
    profile.verification.status = "pending";
    await profile.save();

    res.json({ success: true, message: "Selfie uploaded successfully", url: result.secure_url });
  } catch (err) {
    res.status(500).json({ success: false, message: "Selfie upload failed" });
  }
};

exports.uploadIDDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const files = req.files;
    if (!files || !files.front) return res.status(400).json({ success: false, message: "Front side of ID is required" });

    const frontResult = await uploadStream(files.front[0].buffer, {
      folder: `mafs/users/${userId}/kyc`
    });

    const profile = await getOrCreateProfile(userId);
    profile.verification.docUrl = frontResult.secure_url;
    profile.verification.status = "pending";
    profile.verification.submittedAt = new Date();
    await profile.save();

    res.json({ success: true, message: "ID document uploaded successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "ID upload failed" });
  }
};

exports.getVerificationStatus = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id });
    res.json({
      success: true,
      data: profile?.verification || { status: "not_started" }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch status" });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, city, state, country, full_address } = req.body;
    const profile = await getOrCreateProfile(req.user._id);

    profile.location = {
      type: "Point",
      coordinates: [longitude, latitude],
      city,
      state,
      country,
      full_address
    };

    await profile.save();
    await clearProfileCache(req.user._id);

    res.json({ success: true, message: "Location updated", location: profile.location });
  } catch (err) {
    res.status(500).json({ success: false, message: "Location update failed" });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: {
        isMandatoryComplete: profile.isMandatoryComplete,
        totalCompletion: profile.onboardingProgress?.totalCompletion || 0,
        status: profile.verification?.status || "not_started"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch status" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    if (userId === myId.toString()) {
      return exports.getMyProfile(req, res);
    }

    const staticCacheKey = `profile:static:${userId}`;
    let staticProfile = await cache.get(staticCacheKey);

    // 1. Get/Cache Static Profile Data
    if (!staticProfile) {
      const [targetProfile, masterMap] = await Promise.all([
        Profile.findOne({ userId }).lean(),
        getMasterDataMap()
      ]);

      if (!targetProfile) return res.status(404).json({ success: false, message: "User not found" });

      staticProfile = formatPublictargetProfile(null, targetProfile, null, null, false, null, masterMap);

      // Store coordinates in static profile for live distance calculation
      staticProfile.location = staticProfile.location || {};
      staticProfile.location.coordinates = targetProfile.location?.coordinates;

      await cache.set(staticCacheKey, staticProfile, { EX: 300 }); // 5 min cache
    } else {
      staticProfile = typeof staticProfile === "string" ? JSON.parse(staticProfile) : staticProfile;
    }

    // 2. Get Viewer Data (Live)
    const myProfile = await Profile.findOne({ userId: myId }).select("location").lean();

    // 3. Dynamic Overlay (Distance)
    const finalProfile = { ...staticProfile };

    if (myProfile?.location?.coordinates && staticProfile.location?.coordinates) {
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
      };

      const dist = calculateDistance(
        myProfile.location.coordinates[1],
        myProfile.location.coordinates[0],
        staticProfile.location.coordinates[1],
        staticProfile.location.coordinates[0],
      );
      finalProfile.location.distance = dist <= 1 ? "Nearby" : `${Math.round(dist)} km away`;
    }

    // Remove internal coordinates from response
    delete finalProfile.location.coordinates;

    res.json({ success: true, data: finalProfile });
  } catch (err) {
    console.error("getUserProfile Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch user profile" });
  }
};

exports.updateVisibility = async (req, res) => {
  try {
    const { visibility } = req.body; // everyone, matches_only, nobody
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { "discovery.globalVisibility": visibility },
      { new: true }
    );
    res.json({ success: true, message: "Visibility updated", visibility: profile.discovery?.globalVisibility || visibility });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

exports.resetTestData = async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") return res.status(403).json({ message: "Forbidden" });

    const userId = req.user._id;
    await Profile.deleteOne({ userId });
    await clearProfileCache(userId);

    res.json({ success: true, message: "Test data reset" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Reset failed" });
  }
};
