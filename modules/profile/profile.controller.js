// /* eslint-disable no-unused-vars */
// // const service = require("./profile.service");

// // module.exports.updateBasicInfo = async (req, res) => {
// //   const result = await service.updateBasicInfo(req.user._id, req.body);
// //   return res.json({ success: true, data: result });
// // };

// // module.exports.updateLocation = async (req, res) => {
// //   const result = await service.updateLocation(req.user._id, req.body);
// //   return res.json({ success: true, data: result });
// // };

// // module.exports.updateInterests = async (req, res) => {
// //   const result = await service.updateInterests(req.user._id, req.body);
// //   return res.json({ success: true, data: result });
// // };

// // module.exports.updatePreferences = async (req, res) => {
// //   const result = await service.updatePreferences(req.user._id, req.body);
// //   return res.json({ success: true, data: result });
// // };

// // module.exports.uploadPhoto = async (req, res) => {
// //   const result = await service.uploadPhoto(req.user._id, req.body);
// //   return res.json({ success: true, data: result });
// // };

// // module.exports.markProfileCompleted = async (req, res) => {
// //   const result = await service.markProfileCompleted(req.user._id);
// //   return res.json({ success: true, data: result });
// // };


// // src/modules/profile/profile.controller.js
// const Profile = require("./profile.model");
// const cache = require("../../config/cache");
// const { updateProfileProgress } = require("./profileProgress.util");
// const { upload: uploadMiddleware, handleMulterError } = require('../upload/upload.middleware');
// const { uploadStream, destroy } = require('../upload/cloudinary.service');

// /**
//  * Helper: ensure a profile doc exists for this user (creates empty doc if missing)
//  */
// async function ensureProfile(userId) {
//   // findOneAndUpdate with upsert ensures creation (and returns doc)
//   const profile = await Profile.findOneAndUpdate(
//     { userId },
//     { $setOnInsert: { userId } },
//     { new: true, upsert: true }
//   );
//   return profile;
// }

// /**
//  * Allowed fields for /basic (strict)
//  */

// const BASIC_ALLOWED = ["fullName", "nickname", "bio", "dob", "gender"];

// module.exports.updateBasicInfo = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // ensure profile exists
//     await ensureProfile(userId);

//     // build update data only from allowed fields
//     const update = {};
//     BASIC_ALLOWED.forEach((k) => {
//       if (req.body[k] !== undefined) update[k] = req.body[k];
//     });

//     if (Object.keys(update).length === 0) {
//       return res.status(400).json({ success: false, message: "No valid fields provided" });
//     }

//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $set: update },
//       { new: true, lean : true } // return updated doc
//     );  

//      // Determine if basic step is complete
//     const basicOk = Boolean(profile.fullName && profile.dob && profile.gender);
//     await updateProfileProgress(userId, { basicInfo: basicOk });

//     // invalidate cache
//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);

//     return res.json({ success: true, data: profile, progress: profile.onboardingProgress });
//   } catch (err) {
//     console.error("updateBasicInfo error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// module.exports.updateLocation = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { lat, lon, city, country } = req.body;

//     await ensureProfile(userId);

//     const location = {
//       type: "Point",
//       coordinates: [Number(lon), Number(lat)]
//     };
//     if (city) location.city = city;
//     if (country) location.country = country;

//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $set: { location,"onboardingProgress.updateLocation": true } },
//       { new: true, lean: true }
//     );
//     const locOk = Boolean(location.coordinates && location.coordinates.length === 2 && location.coordinates[0] !== 0 && location.coordinates[1] !== 0);
//     await updateProfileProgress(userId, { location: locOk });

//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);

//     return res.json({ success: true, data: profile });
//   } catch (err) {
//     console.error("updateLocation error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// module.exports.updateInterests = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { add, remove, replace } = req.body;

//     // Profile ensure
//     await ensureProfile(userId);

//     // CASE 1 → Replace all interests
//     if (Array.isArray(replace)) {
//       const profile = await Profile.findOneAndUpdate(
//         { userId },
//         { $set: { interests: replace } },
//         { new: true, lean: true }
//       );
//       return res.json({ success: true, data: profile.interests });
//     }

//     // CASE 2 → Add new interests
//     if (Array.isArray(add) && add.length > 0) {
//       await Profile.updateOne(
//         { userId },
//         { $addToSet: { interests: { $each: add } } }  // atomic + no duplicates
//       );
//     }

//     // CASE 3 → Remove interests
//     if (Array.isArray(remove) && remove.length > 0) {
//       await Profile.updateOne(
//         { userId },
//         { $pull: { interests: { $in: remove } } } // remove many
//       );
//     }

//     // Return final result with 1 optimized read
//     const finalProfile = await Profile.findOne({ userId }).select("interests").lean();
//     return res.json({ success: true, data: finalProfile.interests });

//   } catch (err) {
//     console.error("updateInterests error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


// // module.exports.updateInterests = async (req, res) => {
// //   try {
// //     const userId = req.user._id;
// //     const { interests } = req.body;

// //     if (!Array.isArray(interests) || interests.length === 0) {
// //       return res.status(400).json({ success: false, message: "interests must be a non-empty array" });
// //     }

// //     await ensureProfile(userId);

// //     const profile = await Profile.findOneAndUpdate(
// //       { userId },
// //       { $set: { interests } },
// //       { new: true, lean : true }
// //     );
// //     const ok = Array.isArray(profile.interests) && profile.interests.length > 0;
// //     await updateProfileProgress(userId, { interestsSelected: ok });
// //     await cache.del(`profile:status:${userId}`);
// //     await cache.del(`profile:${userId}`);
// //     return res.json({ success: true, data: profile });
// //     // return res.json({ success: true, data: profile });
// //   } catch (err) {
// //     console.error("updateInterests error:", err);
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };

// module.exports.updaterelationshipGoal = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { relationgoal } = req.body;

//     if (!Array.isArray(relationgoal) || relationgoal.length === 0) {
//       return res.status(400).json({ success: false, message: "relationgoal must be a non-empty array" });
//     }

//     await ensureProfile(userId);

//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $set: { relationgoal } },
//       { new: true, lean : true }
//     );
//     const ok = Array.isArray(profile.relationgoal) && profile.relationgoal.length > 0;
//     await updateProfileProgress(userId, { relationgoalSelected: ok });
//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);
//     return res.json({ success: true, data: profile });
//     // return res.json({ success: true, data: profile });
//   } catch (err) {
//     console.error("relationgoal error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


// module.exports.updatePreferences = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { ageRange, distanceRange, genderPreference } = req.body;

//     // Basic validation (controller-level safety)
//     const update = {};
//     if (ageRange) {
//       if (typeof ageRange.min !== "number" || typeof ageRange.max !== "number") {
//         return res.status(400).json({ success: false, message: "ageRange must contain min and max numbers" });
//       }
//       update["preferences.ageRange"] = ageRange;
//     }
//     if (distanceRange !== undefined) update["preferences.distanceRange"] = Number(distanceRange);
//     if (genderPreference !== undefined) {
//       if (!Array.isArray(genderPreference)) {
//         return res.status(400).json({ success: false, message: "genderPreference must be an array" });
//       }
//       update["preferences.genderPreference"] = genderPreference;
//     }
//     if (Object.keys(update).length === 0) {
//       return res.status(400).json({ success: false, message: "No preferences provided" });
//     }

//     await ensureProfile(userId);

//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $set: update },
//       { new: true, lean : true }
//     );

//      const prefsOk = (profile.preferences && ((profile.preferences.genderPreference && profile.preferences.genderPreference.length > 0) || (profile.preferences.ageRange && profile.preferences.ageRange.min)));
//     await updateProfileProgress(userId, { preferencesSet: Boolean(prefsOk) });

//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);
//     return res.json({ success: true, data: profile });

//   } catch (err) {
//     console.error("updatePreferences error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // Update the uploadPhoto function
// module.exports.uploadPhoto = 
//   // uploadMiddleware.array('photos', 6), // Max 6 files
//   // handleMulterError,
//   async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const files = req.files;

//       if (!files || files.length === 0) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'No files uploaded' 
//         });
//       }

//       // Check total photos won't exceed 6
//       const profile = await Profile.findOne({ userId });
//       const currentPhotoCount = profile?.photos?.length || 0;

//       if (currentPhotoCount + files.length > 6) {
//         return res.status(400).json({
//           success: false,
//           message: `Maximum 6 photos allowed. You already have ${currentPhotoCount} photos.`
//         });
//       }

//       // Process each file
//       const uploadPromises = files.map(async (file) => {
//         const result = await uploadStream(file.buffer, {
//           transformation: [
//             { width: 1000, height: 1000, crop: 'limit', quality: 'auto' }
//           ]
//         });

//         return {
//           url: result.secure_url,
//           publicId: result.public_id,
//           width: result.width,
//           height: result.height,
//           format: result.format,
//           bytes: result.bytes,
//           isPrimary: false,
//           order: (profile?.photos?.length || 0) + 1
//         };
//       });

//       const newPhotos = await Promise.all(uploadPromises);

//       // Update profile with new photos
//       const updatedProfile = await Profile.findOneAndUpdate(
//         { userId },
//         { $push: { photos: { $each: newPhotos } } },
//         { new: true, upsert: true }
//       );

//       // Update onboarding progress
//       const photosOk = updatedProfile.photos.length > 0;
//       await updateProfileProgress(userId, { photosUploaded: photosOk });

//       // Clear cache
//       await cache.del(`profile:status:${userId}`);
//       await cache.del(`profile:${userId}`);

//       return res.json({ 
//         success: true, 
//         data: updatedProfile,
//         message: 'Photos uploaded successfully'
//       });

//     } catch (err) {
//       console.error('Upload error:', err);
//       return res.status(500).json({ 
//         success: false, 
//         message: 'Error uploading photos',
//         error: process.env.NODE_ENV === 'development' ? err.message : undefined
//       });
//     }
//   };
// // Update deletePhoto function
// module.exports.deletePhoto = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { publicId } = req.body;

//     if (!publicId) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'publicId is required' 
//       });
//     }

//     // Find the profile and photo
//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Profile not found' 
//       });
//     }

//     const photoIndex = profile.photos.findIndex(p => p.publicId === publicId);
//     if (photoIndex === -1) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Photo not found' 
//       });
//     }

//     // Delete from Cloudinary
//     await destroy(publicId);

//     // Remove from profile
//     profile.photos.splice(photoIndex, 1);
//     await profile.save();

//     // Update onboarding progress if no photos left
//     const photosOk = profile.photos.length > 0;
//     await updateProfileProgress(userId, { photosUploaded: photosOk });

//     // Clear cache
//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);

//     return res.json({ 
//       success: true, 
//       message: 'Photo deleted successfully' 
//     });

//   } catch (err) {
//     console.error('Delete photo error:', err);
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Error deleting photo',
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// module.exports.markProfileCompleted = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const profile = await Profile.findOne({ userId }).lean();
//     if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

//     const progress = profile.onboardingProgress || {};
//     const allComplete = Boolean(
//       progress.basicInfo &&
//       progress.updateLocation &&
//       progress.interestsSelected &&
//       progress.preferencesSet &&
//       progress.photosUploaded &&
//       progress.kycVerified &&
//       progress.phoneVerified &&
//       progress.emailVerified 
//     );

//     if (!allComplete) {
//       return res.status(400).json({ success: false, message: "Profile not ready to be marked complete", progress });
//     }

//     const updated = await Profile.findOneAndUpdate({ userId }, {
//       $set: {
//         isProfileCompleted: true,
//         isOnboardingCompleted: true,
//         profileCompletedAt: new Date()
//       }
//     }, { new: true, lean: true });

//     // optional: update userAuth isProfileCompleted too (if you store there)
//     // await UserAuth.findByIdAndUpdate(userId, { isProfileCompleted: true });

//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);

//     return res.json({ success: true, message: "Profile completed", data: updated });
//   } catch (err) {
//     console.error("markProfileCompleted error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getMyProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await Profile.findOne({ userId });

//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }

//     res.json({ success: true, data: profile });

//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// exports.getPublicProfile = async (req, res) => {
//   try {
//     const targetUserId = req.params.userId;

//     const profile = await Profile.findOne(
//       { userId: targetUserId, isDiscoverable: true }
//     ).select("-preferences");  // hide personal preference data

//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found or not discoverable" });
//     }

//     res.json({ success: true, data: profile });

//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// exports.deletePhoto = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { order } = req.body;

//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }

//     const updatedPhotos = profile.photos.filter(photo => photo.order !== order);

//     // If no photo removed
//     if (updatedPhotos.length === profile.photos.length) {
//       return res.status(404).json({ success: false, message: "Photo not found" });
//     }

//     profile.photos = updatedPhotos;
//     await profile.save();

//     return res.json({ success: true, message: "Photo deleted" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// exports.deleteAllInterests = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }

//     profile.interests = [];
//     await profile.save();

//     res.json({
//       success: true,
//       message: "All interests deleted",
//       data: profile.interests
//     });
//   } catch (err) {
//     console.error("deleteAllInterests error", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// exports.deleteOneInterest = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { interest } = req.params;

//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }

//     const exists = profile.interests.includes(interest);
//     if (!exists) {
//       return res.status(404).json({ success: false, message: "Interest not found" });
//     }

//     profile.interests = profile.interests.filter(i => i !== interest);
//     await profile.save();

//     res.json({
//       success: true,
//       message: "Interest removed",
//       data: profile.interests
//     });
//   } catch (err) {
//     console.error("deleteOneInterest error", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// module.exports.addInterests = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { interests } = req.body;
//     if (!Array.isArray(interests) || interests.length === 0) {
//       return res.status(400).json({ success: false, message: "interests must be a non-empty array" });
//     }
//     await ensureProfile(userId);
//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $addToSet: { interests: { $each: interests } } },
//       { new: true, upsert: true, lean: true }
//     );
//     const ok = Array.isArray(profile.interests) && profile.interests.length > 0;
//     await updateProfileProgress(userId, { interestsSelected: ok });
//     await cache.del(`profile:status:${userId}`);
//     await cache.del(`profile:${userId}`);
//     return res.json({ success: true, data: profile.interests });
//   } catch (err) {
//     console.error("addInterests error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// module.exports.addPreferences = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { genderPreference } = req.body;

//     if (!Array.isArray(genderPreference) || genderPreference.length === 0) {
//       return res.status(400).json({ success: false, message: "genderPreference must be a non-empty array" });
//     }

//     await ensureProfile(userId);

//     const profile = await Profile.findOne({ userId });

//     const updatedGenderPreference = [...new Set([...profile.preferences.genderPreference, ...genderPreference])];

//     profile.preferences.genderPreference = updatedGenderPreference;
//     await profile.save();

//     return res.json({ success: true, data:  profile.preferences.genderPreference });

//   } catch (err) {
//     console.error("genderPreference error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


// exports.getStatus = async (req, res) => {
//   try {
//     const userId = req.user._id.toString();
//     const cacheKey = `profile:status:${userId}`;

//     const cached = await cache.get(cacheKey);
//     if (cached) {
//       return res.json({ success: true, progress: JSON.parse(cached) });
//     }

//     const profile = await Profile.findOne({ userId }).lean();
//     if (!profile) {
//       // If no profile, return defaults
//       const defaultProgress = {
//         basicInfo: false, location: false, interestsSelected: false,
//         preferencesSet: false, photosUploaded: false, kycVerified: false,
//         completion: 0
//       };
//       await cache.set(cacheKey, defaultProgress, { EX: 30 });
//       return res.json({ success: true, progress: defaultProgress });
//     }

//     const progress = profile.onboardingProgress || { completion: 0 };
//     await cache.set(cacheKey, progress, { EX: 30 });
//     return res.json({ success: true, progress });
//   } catch (err) {
//     console.error("getStatus error", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };



// // module.exports.addInterests = async (req, res) => {
// //   try {
// //     const userId = req.user._id;
// //     const { interests } = req.body;

// //     if (!Array.isArray(interests) || interests.length === 0) {
// //       return res.status(400).json({ success: false, message: "interests must be a non-empty array" });
// //     }

// //     await ensureProfile(userId);

// //     const profile = await Profile.findOne({ userId });

// //     const updatedInterests = [...new Set([...profile.interests, ...interests])];

// //     profile.interests = updatedInterests;
// //     await profile.save();

// //     return res.json({ success: true, data: profile.interests });

// //   } catch (err) {
// //     console.error("addInterests error:", err);
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };





// // module.exports.uploadPhoto = async (req, res) => {
// //   try {
// //     const userId = req.user._id;
// //     const { url, isPrimary = false, order = 0 } = req.body;

// //     if (!url) return res.status(400).json({ success: false, message: "url is required" });

// //     await ensureProfile(userId);

// //     // If isPrimary true, unset previous primary
// //     if (isPrimary) {
// //       await Profile.updateOne(
// //         { userId },
// //         { $set: { "photos.$[p].isPrimary": false } },
// //         { arrayFilters: [{ "p.isPrimary": true }] }
// //       ).catch(() => {}); // ignore if none
// //     }

// //     const profile = await Profile.findOneAndUpdate(
// //       { userId },
// //       { $push: { photos: { url, isPrimary, order } } },
// //       { new: true, upsert: true, lean: true }
// //     );
// //      const photosOk = Array.isArray(profile.photos) && profile.photos.length > 0;
// //     await updateProfileProgress(userId, { photosUploaded: photosOk });

// //     await cache.del(`profile:status:${userId}`);
// //     await cache.del(`profile:${userId}`);

// //     return res.json({ success: true, data: profile });
// //   } catch (err) {
// //     console.error("uploadPhoto error:", err);
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };
// // ``
// // module.exports.markProfileCompleted = async (req, res) => {
// //   try {
// //     const userId = req.user._id;

// //     const profile = await Profile.findOne({ userId });
// //     if (!profile) {
// //       return res.status(404).json({ success: false, message: "Profile not found" });
// //     }

// //     // --- STEP BASED LOGIC ---
// //     const step = profile.onboardingProgress;

// //     step.basicInfo = Boolean(profile.dob && profile.gender);
// //     step.interestsSelected = Array.isArray(profile.interests) && profile.interests.length > 0;
// //     step.photosUploaded = Array.isArray(profile.photos) && profile.photos.length > 0;
// //     step.kycVerified = profile.isKycVerified === true;
// //     step.preferencesSet = profile.preferences && Object.keys(profile.preferences).length > 0;

// //     // Update step tracking
// //     await profile.save();

// //     // --- FINAL COMPLETION CHECK ---
// //     const allStepsCompleted =
// //       step.basicInfo &&
// //       step.interestsSelected &&
// //       step.photosUploaded &&
// //       step.kycVerified &&
// //       step.preferencesSet;

// //     if (!allStepsCompleted) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Profile is not completely ready",
// //         progress: step
// //       });
// //     }

// //     // If all steps are done → mark complete
// //     profile.isProfileCompleted = true;
// //     profile.isOnboardingCompleted = true;
// //     profile.profileCompletedAt = new Date();

// //     await profile.save();

// //     return res.json({
// //       success: true,
// //       message: "Profile completed successfully",
// //       progress: step,
// //       data: profile
// //     });

// //   } catch (err) {
// //     console.error("markProfileCompleted error:", err);
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };





// // module.exports.markProfileCompleted = async (req, res) => {
// //   try {
// //     const userId = req.user._id;

// //     // Optionally validate required fields exist before marking complete
// //     const profile = await Profile.findOne({ userId });
// //     if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

// //     // Example required set - adjust to your rules
// //     const requiredOk = profile.dob && profile.gender && profile.interests > 0 && profile.photos && profile.isKycVerified && profile.photos.length > 0 && profile.preferences > 0;
// //     if (!requiredOk) {
// //       return res.status(400).json({ success: false, message: "Profile not ready to be marked complete" });
// //     }

// //     const updated = await Profile.findOneAndUpdate(
// //       { userId },
// //       {
// //         $set: {
// //           isProfileCompleted: true,
// //           isOnboardingCompleted: true,
// //           profileCompletedAt: new Date()
// //         }
// //       },
// //       { new: true }
// //     );

// //     return res.json({ success: true, data: updated });
// //   } catch (err) {
// //     console.error("markProfileCompleted error:", err);
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };

const Profile = require("./profile.model");
// const User = require("../auth/auth.model");
const cache = require("../../config/cache");
const { uploadStream, destroy } = require("../upload/cloudinary.service");

// ========================================
// HELPER: Get or Create Profile
// ========================================
async function getOrCreateProfile(userId) {
  let profile = await Profile.findOne({ userId });

  if (!profile) {
    // Create empty profile
    profile = await Profile.create({
      userId,
      onboardingStartedAt: new Date()
    });
  }

  return profile;
}

// ========================================
// HELPER: Clear Cache
// ========================================
async function clearProfileCache(userId) {
  try {
    await cache.del(`profile:${userId}`);
    await cache.del(`profile:status:${userId}`);
  } catch (err) {
    console.log("Cache clear warning:", err.message);
  }
}

// ========================================
// HELPER: Format Response
// ========================================
function formatResponse(profile) {
  const completion = profile.calculateCompletion();
  const nextStep = profile.getNextStep();

  return {
    userId: profile.userId,
    profile: {
      nickname: profile.nickname,
      fullName: profile.fullName,
      bio: profile.bio,
      age: profile.age,
      gender: profile.gender,
      dob: profile.dob,
      relationshipGoals: profile.relationshipGoals,
      interests: profile.interests,
      photos: profile.photos,
      location: profile.location,
      lifestyle: profile.lifestyle,
      languages: profile.languages,
      education: profile.education,
      communicationStyle: profile.communicationStyle,
      musicPreference: profile.musicPreference,
      bookPreference: profile.bookPreference,
      travelPreference: profile.travelPreference
    },
    preferences: profile.preferences,
    kyc: {
      status: profile.kyc?.status || "not_started",
      hasSelfie: Boolean(profile.kyc?.selfie?.url),
      hasIDDocument: Boolean(profile.kyc?.idDocument?.frontUrl),
      rejectionReason: profile.kyc?.rejectionReason
    },
    progress: {
      mandatory: completion.mandatory,
      optional: completion.optional,
      total: completion.total,
      isMandatoryComplete: profile.isMandatoryComplete,
      isProfileComplete: profile.isProfileComplete,
      canAccessSwipe: profile.canAccessSwipe,
      isDiscoverable: profile.isDiscoverable,
      onboardingProgress: profile.onboardingProgress
    },
    nextStep: nextStep,
    lastUpdated: profile.lastProfileUpdate || profile.updatedAt
  };
}

// ========================================
// 1. UNIFIED UPDATE API
// ========================================
module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    // Validate at least one field
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        code: "NO_DATA",
        message: "No update data provided"
      });
    }

    // Get profile
    let profile = await getOrCreateProfile(userId);

    // ========================================
    // UPDATE BASIC INFO
    // ========================================
    if (updateData.nickname !== undefined) {
      // Check uniqueness
      const existing = await Profile.findOne({
        nickname: updateData.nickname,
        userId: { $ne: userId }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          code: "NICKNAME_TAKEN",
          message: "Nickname already taken"
        });
      }
      profile.nickname = updateData.nickname.trim();
    }

    if (updateData.fullName !== undefined) {
      profile.fullName = updateData.fullName.trim();
    }

    if (updateData.bio !== undefined) {
      if (updateData.bio.length > 500) {
        return res.status(400).json({
          success: false,
          code: "BIO_TOO_LONG",
          message: "Bio must be under 500 characters"
        });
      }
      profile.bio = updateData.bio.trim();
    }

    if (updateData.dob !== undefined) {
      const dob = new Date(updateData.dob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

      if (age < 18) {
        return res.status(400).json({
          success: false,
          code: "AGE_RESTRICTION",
          message: "You must be at least 18 years old"
        });
      }

      profile.dob = dob;
      profile.age = age;
    }

    if (updateData.gender !== undefined) {
      profile.gender = updateData.gender;
    }

    // ========================================
    // UPDATE RELATIONSHIP GOALS
    // ========================================
    if (updateData.relationshipGoals !== undefined) {
      if (!Array.isArray(updateData.relationshipGoals) || updateData.relationshipGoals.length === 0) {
        return res.status(400).json({
          success: false,
          code: "INVALID_GOALS",
          message: "At least one relationship goal is required"
        });
      }
      profile.relationshipGoals = updateData.relationshipGoals;
    }

    // ========================================
    // UPDATE PREFERENCES
    // ========================================
    if (updateData.genderPreference !== undefined) {
      if (!Array.isArray(updateData.genderPreference) || updateData.genderPreference.length === 0) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PREFERENCE",
          message: "At least one gender preference is required"
        });
      }
      profile.preferences.genderPreference = updateData.genderPreference;
    }

    if (updateData.ageRange !== undefined) {
      const { min, max } = updateData.ageRange;
      if (!min || !max || min < 18 || max > 100 || min >= max) {
        return res.status(400).json({
          success: false,
          code: "INVALID_AGE_RANGE",
          message: "Invalid age range. Min must be 18+, max 100, and min < max"
        });
      }
      profile.preferences.ageRange = { min, max };
    }

    if (updateData.distanceRange !== undefined) {
      const distance = Number(updateData.distanceRange);
      if (distance < 1 || distance > 500) {
        return res.status(400).json({
          success: false,
          code: "INVALID_DISTANCE",
          message: "Distance must be between 1 and 500 km"
        });
      }
      profile.preferences.distanceRange = distance;
    }

    // ========================================
    // UPDATE INTERESTS
    // ========================================
    if (updateData.interests !== undefined) {
      if (!Array.isArray(updateData.interests)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_INTERESTS",
          message: "Interests must be an array"
        });
      }

      if (updateData.interests.length < 3) {
        return res.status(400).json({
          success: false,
          code: "MIN_INTERESTS",
          message: "Please select at least 3 interests"
        });
      }

      if (updateData.interests.length > 15) {
        return res.status(400).json({
          success: false,
          code: "MAX_INTERESTS",
          message: "Maximum 15 interests allowed"
        });
      }

      profile.interests = updateData.interests;
    }

    // ========================================
    // UPDATE TIER 2 (OPTIONAL FIELDS)
    // ========================================

    // Lifestyle
    if (updateData.lifestyle !== undefined) {
      profile.lifestyle = {
        ...profile.lifestyle,
        ...updateData.lifestyle
      };
    }

    // Languages
    if (updateData.languages !== undefined) {
      if (!Array.isArray(updateData.languages)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_LANGUAGES",
          message: "Languages must be an array"
        });
      }
      profile.languages = updateData.languages;
    }

    // Education
    if (updateData.education !== undefined) {
      profile.education = {
        ...profile.education,
        ...updateData.education
      };
    }

    // Communication Style
    if (updateData.communicationStyle !== undefined) {
      profile.communicationStyle = updateData.communicationStyle;
    }

    // Music Preference
    if (updateData.musicPreference !== undefined) {
      if (!Array.isArray(updateData.musicPreference)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_MUSIC",
          message: "Music preference must be an array"
        });
      }
      profile.musicPreference = updateData.musicPreference;
    }

    // Book Preference
    if (updateData.bookPreference !== undefined) {
      if (!Array.isArray(updateData.bookPreference)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_BOOKS",
          message: "Book preference must be an array"
        });
      }
      profile.bookPreference = updateData.bookPreference;
    }

    // Travel Preference
    if (updateData.travelPreference !== undefined) {
      profile.travelPreference = updateData.travelPreference;
    }

    // ========================================
    // SAVE & CALCULATE (Triggers pre-save hook)
    // ========================================
    await profile.save();

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    const response = formatResponse(profile);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: response
    });

  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({
      success: false,
      code: "UPDATE_FAILED",
      message: err.message
    });
  }
};

// ========================================
// 2. UPLOAD PHOTOS
// ========================================
module.exports.uploadPhotos = async (req, res) => {
  try {
    const userId = req.user._id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    // Get profile
    let profile = await getOrCreateProfile(userId);

    // Check max photos
    if (profile.photos.length + files.length > 6) {
      return res.status(400).json({
        success: false,
        message: `Maximum 6 photos allowed. You have ${profile.photos.length} photo(s).`
      });
    }

    // Upload to Cloudinary
    const uploadPromises = files.map(async (file) => {
      const result = await uploadStream(file.buffer, {
        folder: `mafs/users/${userId}/photos`,
        transformation: [
          { width: 1080, height: 1350, crop: "fill", quality: "auto:good" }
        ]
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        uploadedAt: new Date()
      };
    });

    const newPhotos = await Promise.all(uploadPromises);

    // Add photos with proper order
    newPhotos.forEach((photo, index) => {
      profile.photos.push({
        ...photo,
        order: profile.photos.length + index + 1,
        isPrimary: profile.photos.length === 0 && index === 0 // First photo is primary
      });
    });

    // Save (triggers progress calculation)
    await profile.save();

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    const response = formatResponse(profile);

    return res.json({
      success: true,
      message: `${newPhotos.length} photo(s) uploaded successfully`,
      data: response
    });

  } catch (err) {
    console.error("Upload photos error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload photos. Please try again"
    });
  }
};

// ========================================
// 3. DELETE PHOTO
// ========================================
module.exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { publicId } = req.body;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found"
      });
    }

    const photoIndex = profile.photos.findIndex(p => p.publicId === publicId);
    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        code: "PHOTO_NOT_FOUND",
        message: "Photo not found"
      });
    }

    // Delete from Cloudinary
    await destroy(publicId);

    // Remove from profile
    profile.photos.splice(photoIndex, 1);

    // Reorder remaining photos
    profile.photos.forEach((photo, index) => {
      photo.order = index + 1;
      if (index === 0) photo.isPrimary = true;
      else photo.isPrimary = false;
    });

    // Save
    await profile.save();

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    const response = formatResponse(profile);

    return res.json({
      success: true,
      message: "Photo deleted successfully",
      data: response
    });

  } catch (err) {
    console.error("Delete photo error:", err);
    return res.status(500).json({
      success: false,
      code: "DELETE_FAILED",
      message: err.message
    });
  }
};

// ========================================
// 4. UPLOAD SELFIE (KYC)
// ========================================
module.exports.uploadSelfie = async (req, res) => {
  try {
    const userId = req.user._id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Get profile
    let profile = await getOrCreateProfile(userId);

    // Upload to Cloudinary
    const result = await uploadStream(file.buffer, {
      folder: `mafs/users/${userId}/kyc`,
      transformation: [
        { width: 800, height: 800, crop: "fill", quality: "auto:best" }
      ]
    });

    // Update profile
    if (!profile.kyc) profile.kyc = {};

    profile.kyc.selfie = {
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    };

    // Update KYC status
    if (profile.kyc.status === "not_started") {
      profile.kyc.status = "pending";
    }

    // Save
    await profile.save();

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    const response = formatResponse(profile);

    // return res.json({
    //   success: true,
    //   message: "Selfie uploaded successfully",
    //   data: response
    // });

    return res.json({
      success: true,
      message: "Selfie uploaded successfully",
      data: {
        selfie: {
          url: profile.kyc.selfie.url, // ✅ Selfie URL
          uploadedAt: profile.kyc.selfie.uploadedAt
        },
        kycStatus: profile.kyc.status,
        progress: response.progress,
        nextStep: response.nextStep
      }
    });

  } catch (err) {
    console.error("Upload selfie error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload selfie. Please try again"
    });
  }
};

// ========================================
// 5. UPLOAD ID DOCUMENT (KYC)
// ========================================
module.exports.uploadIDDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const files = req.files;
    const { idType } = req.body;

    if (!files || !files.front) {
      return res.status(400).json({
        success: false,
        message: "ID front image is required"
      });
    }

    if (!idType) {
      return res.status(400).json({
        success: false,
        message: "ID type is required (driving_license, passport, proof_of_age)"
      });
    }

    // Get profile
    let profile = await getOrCreateProfile(userId);

    // Upload front
    const frontResult = await uploadStream(files.front[0].buffer, {
      folder: `mafs/users/${userId}/kyc`,
      transformation: [
        { width: 1200, height: 800, crop: "limit", quality: "auto:best" }
      ]
    });

    const idData = {
      type: idType,
      frontUrl: frontResult.secure_url,
      frontPublicId: frontResult.public_id,
      uploadedAt: new Date()
    };

    // Upload back if provided
    if (files.back && files.back[0]) {
      const backResult = await uploadStream(files.back[0].buffer, {
        folder: `mafs/users/${userId}/kyc`,
        transformation: [
          { width: 1200, height: 800, crop: "limit", quality: "auto:best" }
        ]
      });

      idData.backUrl = backResult.secure_url;
      idData.backPublicId = backResult.public_id;
    }

    // Update profile
    if (!profile.kyc) profile.kyc = {};

    profile.kyc.idDocument = idData;

    // Update KYC status to pending (if selfie already uploaded)
    if (profile.kyc.selfie && profile.kyc.selfie.url) {
      profile.kyc.status = "pending";
      profile.kyc.submittedAt = new Date();
    }

    // Save
    await profile.save();

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    const response = formatResponse(profile);

    // return res.json({
    //   success: true,
    //   message: "ID document uploaded successfully. Your submission is under review.",
    //   data: response
    // });

    return res.json({
      success: true,
      message: "ID document uploaded successfully. Your verification is under review",
      data: {
        idDocument: {
          type: profile.kyc.idDocument.type, // ✅ ID type
          frontUrl: profile.kyc.idDocument.frontUrl, // ✅ Front URL
          backUrl: profile.kyc.idDocument.backUrl, // ✅ Back URL (if exists)
          uploadedAt: profile.kyc.idDocument.uploadedAt
        },
        kycStatus: profile.kyc.status,
        kycMessage: profile.kyc.status === "pending"
          ? "Your verification is under review. This usually takes 24-48 hours"
          : "Please upload selfie to submit for verification",
        progress: response.progress,
        nextStep: response.nextStep
      }
    });

  } catch (err) {
    console.error("Upload ID error:", err);
    return res.status(500).json({
      success: false,
      code: "UPLOAD_FAILED",
      message: err.message
    });
  }
};

// ========================================
// 6. UPDATE LOCATION
// ========================================
module.exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { latitude, longitude, city, state, country } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        code: "MISSING_COORDS",
        message: "Latitude and longitude are required"
      });
    }

    // Get profile
    let profile = await getOrCreateProfile(userId);

    // Update location
    profile.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
      city: city || "",
      state: state || "",
      country: country || ""
    };

    // Save
    await profile.save();

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    const response = formatResponse(profile);

    return res.json({
      success: true,
      message: "Location updated successfully",
      data: response
    });

  } catch (err) {
    console.error("Update location error:", err);
    return res.status(500).json({
      success: false,
      code: "UPDATE_FAILED",
      message: err.message
    });
  }
};

// ========================================
// 7. GET STATUS (Lightweight)
// ========================================
module.exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `profile:status:${userId}`;

    // Check cache
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }
    } catch (cacheErr) {
      console.log("Cache read warning:", cacheErr.message);
    }

    // Get profile
    const profile = await getOrCreateProfile(userId);

    // Format response
    const response = formatResponse(profile);

    // Cache for 30 seconds
    try {
      await cache.set(cacheKey, JSON.stringify(response), { EX: 30 });
    } catch (cacheErr) {
      console.log("Cache write warning:", cacheErr.message);
    }

    return res.json({
      success: true,
      data: response,
      cached: false
    });

  } catch (err) {
    console.error("Get status error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ========================================
// 8. GET FULL PROFILE
// ========================================
module.exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ userId }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found"
      });
    }

    return res.json({
      success: true,
      data: profile
    });

  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ========================================
// 9. GET PUBLIC PROFILE
// ========================================
module.exports.getPublicProfile = async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    const profile = await Profile.findOne({
      userId: targetUserId,
      isDiscoverable: true
    })
      .select("-preferences -kyc -onboardingProgress")
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found or not discoverable"
      });
    }

    return res.json({
      success: true,
      data: profile
    });

  } catch (err) {
    console.error("Get public profile error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};




exports.updateDiscoveryPreference = async (req, res) => {
  try {
    const userId = req.user._id;
    const body = req.body;

    const update = {};

    // =========================
    // HARD FILTERS (MANDATORY)
    // =========================
    if (body.preferences) {
      if (body.preferences.ageRange)
        update["preferences.ageRange"] = body.preferences.ageRange;

      if (body.preferences.distanceRange)
        update["preferences.distanceRange"] = body.preferences.distanceRange;

      if (body.preferences.genderPreference)
        update["preferences.genderPreference"] = body.preferences.genderPreference;
    }

    // =========================
    // SOFT FILTERS (OPTIONAL)
    // =========================
    if (body.discoveryFilters) {
      if (body.discoveryFilters.hasBio !== undefined)
        update["discoveryFilters.hasBio"] = body.discoveryFilters.hasBio;

      update["interests"] = body.discoveryFilters.interests;

      update["relationshipGoals"] = body.discoveryFilters.relationshipGoals;


      if (body.discoveryFilters.basics)
        update["discoveryFilters.basics"] =
          body.discoveryFilters.basics;

      if (body.discoveryFilters.lifestyle)
        update["discoveryFilters.lifestyle"] =
          body.discoveryFilters.lifestyle;
    }

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    return res.json({
      success: true,
      message: "Discovery preference updated successfully",
      data: {
        preferences: profile.preferences,
        discoveryFilters: profile.discoveryFilters
      }
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};



exports.updateVisibility = async (req, res) => {
  try {
    const { visibility } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!["everyone", "matches_only", "nobody"].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: "Invalid visibility setting. Must be one of: everyone, matches_only, nobody"
      });
    }

    // Update profile
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          visibility,
          // For backward compatibility
          isDiscoverable: visibility !== "nobody" 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Clear any cached profile data
    await clearProfileCache(userId);

    return res.json({
      success: true,
      message: "Visibility updated successfully",
      data: {
        visibility: profile.visibility,
        isDiscoverable: profile.isDiscoverable
      }
    });

  } catch (error) {
    console.error("Error updating visibility:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update visibility settings",
      error: error.message
    });
  }
};

// // Helper function to clear profile cache
// async function clearProfileCache(userId) {
//   // Implement your cache clearing logic here if you're using caching
//   // Example: await cache.del(`profile:${userId}`);
// }