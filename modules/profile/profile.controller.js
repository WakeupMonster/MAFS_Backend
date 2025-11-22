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
      { new: true } // return updated doc
    );

    return res.json({ success: true, data: profile });
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
      { $set: { location } },
      { new: true }
    );

    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("updateLocation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.updateInterests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interests } = req.body;

    if (!Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ success: false, message: "interests must be a non-empty array" });
    }

    await ensureProfile(userId);

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: { interests } },
      { new: true }
    );
    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("updateInterests error:", err);
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
      { new: true }
    );

    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("updatePreferences error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { url, isPrimary = false, order = 0 } = req.body;

    if (!url) return res.status(400).json({ success: false, message: "url is required" });

    await ensureProfile(userId);

    // If isPrimary true, unset previous primary
    if (isPrimary) {
      await Profile.updateOne(
        { userId },
        { $set: { "photos.$[p].isPrimary": false } },
        { arrayFilters: [{ "p.isPrimary": true }] }
      ).catch(() => {}); // ignore if none
    }

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $push: { photos: { url, isPrimary, order } } },
      { new: true }
    );

    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("uploadPhoto error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.markProfileCompleted = async (req, res) => {
  try {
    const userId = req.user._id;

    // Optionally validate required fields exist before marking complete
    const profile = await Profile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    // Example required set - adjust to your rules
    const requiredOk = profile.dob && profile.gender && profile.interests > 0 && profile.photos && profile.isKycVerified && profile.photos.length > 0 && profile.preferences > 0;
    if (!requiredOk) {
      return res.status(400).json({ success: false, message: "Profile not ready to be marked complete" });
    }

    const updated = await Profile.findOneAndUpdate(
      { userId },
      {
        $set: {
          isProfileCompleted: true,
          isOnboardingCompleted: true,
          profileCompletedAt: new Date()
        }
      },
      { new: true }
    );

    return res.json({ success: true, data: updated });
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

    const profile = await Profile.findOne({ userId });

    const updatedInterests = [...new Set([...profile.interests, ...interests])];

    profile.interests = updatedInterests;
    await profile.save();

    return res.json({ success: true, data: profile.interests });

  } catch (err) {
    console.error("addInterests error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


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
