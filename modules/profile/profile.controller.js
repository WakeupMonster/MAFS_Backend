/* eslint-disable no-unused-vars */
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
const { Match } = require("../matches/swipe/swipe.model");
// const { formatProfileResponse } = require("./profile.service");
// const User = require("../auth/auth.model");
const cache = require("../../config/cache");
const { uploadStream, destroy } = require("../upload/cloudinary.service");
const redis = require("../../config/cache");
const User = require("../auth/auth.model");

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
  // const completion = profile.calculateCompletion();
  // const nextStep = profile.getNextStep();

  return {
    userId: profile.userId,
    photos: profile.photos,
    // preferences: profile.preferences,
    // location: profile.location
    // profile: {
    //   // nickname: profile.nickname,
    //   // fullName: profile.fullName,
    //   // bio: profile.bio,
    //   // age: profile.age,
    //   // gender: profile.gender,
    //   // dob: profile.dob,
    //   // relationshipGoal: profile.relationshipGoal,
    //   // interests: profile.interests,
    //   photos: profile.photos,
    //   // location: profile.location,
    //   // lifestyle: profile.lifestyle,
    //   // languages: profile.languages,
    //   // education: profile.education,
    //   // communicationStyle: profile.communicationStyle,
    //   // musicPreference: profile.musicPreference,
    //   // bookPreference: profile.bookPreference,
    //   // travelPreference: profile.travelPreference
    // },
    // preferences: profile.preferences,
    // kyc: {
    //   status: profile.kyc?.status || "not_started",
    //   hasSelfie: Boolean(profile.kyc?.selfie?.url),
    //   hasIDDocument: Boolean(profile.kyc?.idDocument?.frontUrl),
    //   rejectionReason: profile.kyc?.rejectionReason
    // },
    // progress: {
    //   mandatory: completion.mandatory,
    //   optional: completion.optional,
    //   total: completion.total,
    //   isMandatoryComplete: profile.isMandatoryComplete,
    //   isProfileComplete: profile.isProfileComplete,
    //   canAccessSwipe: profile.canAccessSwipe,
    //   isDiscoverable: profile.isDiscoverable,
    //   onboardingProgress: profile.onboardingProgress
    // },
    // nextStep: nextStep,
    // lastUpdated: profile.lastProfileUpdate || profile.updatedAt
  };
} 

// ========================================
// 1. UNIFIED UPDATE API
// ========================================
// module.exports.updateProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const updateData = req.body;


//     // Validate at least one field
//     if (Object.keys(updateData).length === 0) {
//       return res.status(400).json({
//         success: false,
//         code: "NO_DATA",
//         message: "No update data provided"
//       });
//     }

//     // Get profile
//     let profile = await getOrCreateProfile(userId);

//     // ========================================
//     // UPDATE BASIC INFO
//     // ========================================
//     if (updateData.nickname !== undefined) {
//       // Check uniqueness
//       const existing = await Profile.findOne({
//         nickname: updateData.nickname,
//         userId: { $ne: userId }
//       });
//       if (existing) {
//         return res.status(400).json({
//           success: false,
//           code: "NICKNAME_TAKEN",
//           message: "Nickname already taken"
//         });
//       }
//       profile.nickname = updateData.nickname.trim();
//     }

//     if (updateData.fullName !== undefined) {
//       profile.fullName = updateData.fullName.trim();
//     }

//     if (updateData.bio !== undefined) {
//       if (updateData.bio.length > 500) {
//         return res.status(400).json({
//           success: false,
//           code: "BIO_TOO_LONG",
//           message: "Bio must be under 500 characters"
//         });
//       }
//       profile.bio = updateData.bio.trim();
//     }

//     if (updateData.dob !== undefined) {
//       const dob = new Date(updateData.dob);
//       const today = new Date();
//       let age = today.getFullYear() - dob.getFullYear();
//       const m = today.getMonth() - dob.getMonth();
//       if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

//       if (age < 18) {
//         return res.status(400).json({
//           success: false,
//           code: "AGE_RESTRICTION",
//           message: "You must be at least 18 years old"
//         });
//       }

//       profile.dob = dob;
//       profile.age = age;
//     }

//     if (updateData.gender !== undefined) {
//       profile.gender = updateData.gender;
//     }

//     // ========================================
//     // UPDATE RELATIONSHIP GOALS
//     // ========================================
//     // if (updateData.relationshipGoals !== undefined) {
//     //   if (!Array.isArray(updateData.relationshipGoals) || updateData.relationshipGoals.length === 0) {
//     //     return res.status(400).json({
//     //       success: false,
//     //       code: "INVALID_GOALS",
//     //       message: "At least one relationship goal is required"
//     //     });
//     //   }
//     //   profile.relationshipGoals = updateData.relationshipGoals;
//     // }

//     // ========================================
// // UPDATE RELATIONSHIP GOAL (FINAL – OBJECT BASED)
// // ========================================
// if (updateData.relationshipGoal !== undefined) {
//   const { key, title, subtitle } = updateData.relationshipGoal;

//   if (!key || !title || !subtitle) {
//     return res.status(400).json({
//       success: false,
//       code: "INVALID_RELATIONSHIP_GOAL",
//       message: "relationshipGoal requires key, title and subtitle"
//     });
//   }

//   const allowedKeys = [
//     "dating",
//     "friendship",
//     "casual",
//     "serious",
//     "networking",
//     "open_to_options",
//      'height', 'jobtitle', 'occupation', 'about_me', 
//       'company', 'school', 'basics', 'lifestyle', 'interests'
//   ];

//   if (!allowedKeys.includes(key)) {
//     return res.status(400).json({
//       success: false,
//       code: "INVALID_RELATIONSHIP_GOAL_KEY",
//       message: "Invalid relationship goal key"
//     });
//   }

//   profile.relationshipGoal = {
//     key,
//     title,
//     subtitle
//   };
// }




//     // ========================================
//     // UPDATE PREFERENCES
//     // ========================================
//     if (updateData.genderPreference !== undefined) {
//       if (!Array.isArray(updateData.genderPreference) || updateData.genderPreference.length === 0) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_PREFERENCE",
//           message: "At least one gender preference is required"
//         });
//       }
//       profile.preferences.genderPreference = updateData.genderPreference;
//     }

//     if (updateData.ageRange !== undefined) {
//       const { min, max } = updateData.ageRange;
//       if (!min || !max || min < 18 || max > 100 || min >= max) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_AGE_RANGE",
//           message: "Invalid age range. Min must be 18+, max 100, and min < max"
//         });
//       }
//       profile.preferences.ageRange = { min, max };
//     }

//     if (updateData.distanceRange !== undefined) {
//       const distance = Number(updateData.distanceRange);
//       if (distance < 1 || distance > 500) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_DISTANCE",
//           message: "Distance must be between 1 and 500 km"
//         });
//       }
//       profile.preferences.distanceRange = distance;
//     }

//     if(updateData.height !== undefined){
//       profile.height = updateData.height;
//     }
//       if(updateData.jobtitle !== undefined){
//       profile.jobtitle = updateData.jobtitle;
//     }
//       if(updateData.occupation !== undefined){
//       profile.occupation = updateData.occupation;
//     }
//        if(updateData.about_me !== undefined){
//       profile.about_me = updateData.about_me;
//     }
//      if(updateData.company !== undefined){
//       profile.company = updateData.company;
//     }
//       if(updateData.school !== undefined){
//       profile.school = updateData.school;
//     }
//     // ========================================
//     // UPDATE INTERESTS
//     // ========================================
//     if (updateData.interests !== undefined) {
//       if (!Array.isArray(updateData.interests)) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_INTERESTS",
//           message: "Interests must be an array"
//         });
//       }

//       if (updateData.interests.length < 3) {
//         return res.status(400).json({
//           success: false,
//           code: "MIN_INTERESTS",
//           message: "Please select at least 3 interests"
//         });
//       }

//       if (updateData.interests.length > 15) {
//         return res.status(400).json({
//           success: false,
//           code: "MAX_INTERESTS",
//           message: "Maximum 15 interests allowed"
//         });
//       }

//       profile.interests = updateData.interests;
//     }

//     // ========================================
//     // UPDATE TIER 2 (OPTIONAL FIELDS)
//     // ========================================

//     // Lifestyle
//     if (updateData.lifestyle !== undefined) {
//       profile.lifestyle = {
//         ...profile.lifestyle,
//         ...updateData.lifestyle
//       };
//     }

//     // Languages
//     if (updateData.languages !== undefined) {
//       if (!Array.isArray(updateData.languages)) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_LANGUAGES",
//           message: "Languages must be an array"
//         });
//       }
//       profile.languages = updateData.languages;
//     }

//     // Education
//     if (updateData.education !== undefined) {
//       profile.education = {
//         ...profile.education,
//         ...updateData.education
//       };
//     }

//     // Communication Style
//     if (updateData.communicationStyle !== undefined) {
//       profile.communicationStyle = updateData.communicationStyle;
//     }

//     // Music Preference
//     if (updateData.musicPreference !== undefined) {
//       if (!Array.isArray(updateData.musicPreference)) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_MUSIC",
//           message: "Music preference must be an array"
//         });
//       }
//       profile.musicPreference = updateData.musicPreference;
//     }

//     // Book Preference
//     if (updateData.bookPreference !== undefined) {
//       if (!Array.isArray(updateData.bookPreference)) {
//         return res.status(400).json({
//           success: false,
//           code: "INVALID_BOOKS",
//           message: "Book preference must be an array"
//         });
//       }
//       profile.bookPreference = updateData.bookPreference;
//     }

//     // Travel Preference
//     if (updateData.travelPreference !== undefined) {
//       profile.travelPreference = updateData.travelPreference;
//     }

    
//     // ========================================
//     // SAVE & CALCULATE (Triggers pre-save hook)
//     // ========================================
//     await profile.save();

//     // Clear cache
//     await clearProfileCache(userId);

//     // Format response
//     // const response = formatResponse(profile);

//     return res.json({
//       success: true,
//       message: "Profile updated successfully",
//       // data: response
//     });

//   } catch (err) {
//     console.error("Update profile error:", err);
//     return res.status(500).json({
//       success: false,
//       code: "UPDATE_FAILED",
//       message: err.message
//     });
//   }
// };

const BlockedContact = require("../BlockedContact/blockedContacts.model");
const Block = require("../profile/user.block")
const { formatProfileResponse } = require("./profile.formatter");
const UserSubscription = require("../auth/UserSubscription.model")

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;
    let profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    // --- 1. Basic Profile Update ---
    if (updateData.profile) {
      const p = updateData.profile;
      const basicFields = ['nickname', 'dob', 'gender', 'height', 'about', 'jobTitle', 'company', 'school', 'pronouns', 'weight'];
      
      basicFields.forEach(field => {
        if (p[field] !== undefined) profile[field] = p[field];
      });

      // Nickname uniqueness check
      if (p.nickname) {
        const existing = await Profile.findOne({ nickname: p.nickname, userId: { $ne: userId } });
        if (existing) return res.status(400).json({ success: false, code: "NICKNAME_TAKEN", message: "Nickname taken" });
      }
    }

    // --- 2. Attributes Update (Figma Traits) ---
    if (updateData.attributes) {
      const attr = updateData.attributes;
      profile.attributes = profile.attributes || {};
      
      const traitFields = [
        'zodiac', 'education', 'familyPlans', 'personalityType', 'communicationStyle', 
        'loveStyle', 'bloodType', 'covidVaccine', 'religion', 'pets', 'drinking', 
        'smoking', 'workout', 'dietary', 'sleeping', 'socialMedia'
      ];

      traitFields.forEach(field => {
        if (attr[field] !== undefined) profile.attributes[field] = attr[field];
      });

      // Array Traits
      const arrayTraits = ['languages', 'interests', 'music', 'movies', 'books', 'travel'];
      arrayTraits.forEach(field => {
        if (attr[field] !== undefined) profile.attributes[field] = Array.isArray(attr[field]) ? attr[field] : [attr[field]];
      });
    }

    // --- 3. Discovery Preferences ---
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

      if (disc.showMeGender) {
        profile.discovery.showMeGender = Array.isArray(disc.showMeGender) ? disc.showMeGender : [disc.showMeGender];
      }
    }
     const user = await User.findById(userId).lean();

    profile.lastProfileUpdate = new Date();
    await profile.save();

    
    
    const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
    let subData = await UserSubscription.findOne({ userId });
      if (!subData) {
        // Naya user hai toh default create karo
        subData = await UserSubscription.create({ userId});
      }
      // Reset counters if it's a new day
      subData.resetIfNeeded()
      // await redis.del(redisKey);
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

    res.json({ success: true, message: "Profile updated successfully" ,  data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
      } });

    // res.json({ success: true, message: "Profile updated successfully" });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await Profile.findOne({ userId });
    
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });


   const user = await User.findById(userId).lean();
     const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
    let subData = await UserSubscription.findOne({ userId });
      if (!subData) {
        // Naya user hai toh default create karo
        subData = await UserSubscription.create({ userId});
      }
      // Reset counters if it's a new day
      subData.resetIfNeeded()
      // await redis.del(redisKey);
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

    res.json({ success: true ,  data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
      } });


    // const blockedContacts = await BlockedContact.find({ userId }).lean();
    // const blockedUser = await Block.find({blockerId : userId}).lean()
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

    // res.json({ success: true, data: formatted });
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};






// purana wala hain In your profile.controller.js
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
const user = await User.findById(userId).lean();
     const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
    let subData = await UserSubscription.findOne({ userId });
      if (!subData) {
        // Naya user hai toh default create karo
        subData = await UserSubscription.create({ userId});
      }
      // Reset counters if it's a new day
      subData.resetIfNeeded()
      // await redis.del(redisKey);
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

    res.json({  success: true,
      message: `${newPhotos.length} photo uploaded successfully`,  data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
      } });



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

    const user = await User.findById(userId).lean();
     const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
    let subData = await UserSubscription.findOne({ userId });
      if (!subData) {
        // Naya user hai toh default create karo
        subData = await UserSubscription.create({ userId});
      }
      // Reset counters if it's a new day
      subData.resetIfNeeded()
      // await redis.del(redisKey);
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

    res.json({  success: true,
      message: "photo deleted successfully",  data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
      } });


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
// 4. REORDER PHOTOS (Drag & Drop)
// ========================================
module.exports.reorderPhotos = async (req, res) => {
  try {
    const userId = req.user._id;
    const { photoIds } = req.body;

    // 1️⃣ Validation
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "photoIds array is required"
      });
    }

    // 2️⃣ Profile fetch
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found"
      });
    }

    // 3️⃣ Length validation (security check)
    if (photoIds.length !== profile.photos.length) {
      return res.status(400).json({
        success: false,
        message: "Photo count mismatch"
      });
    }

    // 4️⃣ Create map for fast lookup
const photoMap = new Map();
profile.photos.forEach(photo => {
  // toString() use karo taaki comparison mein issue na aaye
  photoMap.set(photo.publicId.toString(), photo);
});

// 5️⃣ Validate all photoIds exist
for (const id of photoIds) {
  // Trim aur string check
  if (!photoMap.has(id.trim())) {
    console.log("Map Keys:", Array.from(photoMap.keys())); // Debugging ke liye
    console.log("Looking for:", id);
    
    return res.status(400).json({
      success: false,
      message: `Invalid photoId: ${id}. Make sure it matches publicId exactly.`
    });
  }
}

    // // 4️⃣ Create map for fast lookup
    // const photoMap = new Map();
    // profile.photos.forEach(photo => {
    //   photoMap.set(photo.publicId, photo);
    // });

    // // 5️⃣ Validate all photoIds exist
    // for (const id of photoIds) {
    //   if (!photoMap.has(id)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: `Invalid photoId: ${id}`
    //     });
    //   }
    // }

    // 6️⃣ Reorder logic
    const reorderedPhotos = photoIds.map((id, index) => {
      const photo = photoMap.get(id);

      return {
        ...photo.toObject(),
        order: index + 1,
        isPrimary: index === 0 // first photo becomes primary
      };
    });

    profile.photos = reorderedPhotos;
    const user = await User.findById(userId).lean();
     const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
    let subData = await UserSubscription.findOne({ userId });
      if (!subData) {
        // Naya user hai toh default create karo
        subData = await UserSubscription.create({ userId});
      }
      // Reset counters if it's a new day
      subData.resetIfNeeded()
      // await redis.del(redisKey);
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);


    // 7️⃣ Save
    await profile.save();

    // 8️⃣ Clear cache
    await clearProfileCache(userId);
    
    res.json({  success: true,
      message: "Photos reordered successfully",  data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
      } });

  } catch (err) {
    console.error("Reorder photos error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reorder photos"
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
    // if (!profile.kyc) profile.kyc = {};

    // profile.kyc.selfie = {
    //   url: result.secure_url,
    //   publicId: result.public_id,
    //   uploadedAt: new Date()
    // };

    // // Update KYC status
    // if (profile.kyc.status === "not_started") {
    //   profile.kyc.status = "pending";
    // }
    profile.verification.selfieUrl = result.url;
profile.verification.status = "pending"; 
  

await profile.save();

    // Save

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    // const response = formatResponse(profile);

    // return res.json({
    //   success: true,
    //   message: "Selfie uploaded successfully",
    //   data: response
    // });

      const user = await User.findById(userId).lean();
     const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
    let subData = await UserSubscription.findOne({ userId });
      if (!subData) {
        // Naya user hai toh default create karo
        subData = await UserSubscription.create({ userId});
      }
      // Reset counters if it's a new day
      subData.resetIfNeeded()
      // await redis.del(redisKey);
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

    res.json({  success: true,
      message: "Selfie uploaded successfully",  data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
      } });

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
// module.exports.uploadIDDocument = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const files = req.files;
//     const { idType } = req.body;

//     if (!files || !files.front) {
//       return res.status(400).json({
//         success: false,
//         message: "ID front image is required"
//       });
//     }

//     if (!idType) {
//       return res.status(400).json({
//         success: false,
//         message: "ID type is required (driving_license, passport, proof_of_age)"
//       });
//     }

//     // Get profile
//     let profile = await getOrCreateProfile(userId);

//     // Upload front
//     const frontResult = await uploadStream(files.front[0].buffer, {
//       folder: `mafs/users/${userId}/kyc`,
//       transformation: [
//         { width: 1200, height: 800, crop: "limit", quality: "auto:best" }
//       ]
//     });

//     const idData = {
//       type: idType,
//       frontUrl: frontResult.secure_url,
//       frontPublicId: frontResult.public_id,
//       uploadedAt: new Date()
//     };

//     // Upload back if provided
//     if (files.back && files.back[0]) {
//       const backResult = await uploadStream(files.back[0].buffer, {
//         folder: `mafs/users/${userId}/kyc`,
//         transformation: [
//           { width: 1200, height: 800, crop: "limit", quality: "auto:best" }
//         ]
//       });

//       idData.backUrl = backResult.secure_url;
//       idData.backPublicId = backResult.public_id;
//     }

//     // Update profile
//     if (!profile.kyc) profile.kyc = {};

//     profile.kyc.idDocument = idData;

//     // Update KYC status to pending (if selfie already uploaded)
//     if (profile.kyc.selfie && profile.kyc.selfie.url) {
//       profile.kyc.status = "pending";
//       profile.kyc.submittedAt = new Date();
//     }

//     // Save
//     await profile.save();

//     // Clear cache
//     await clearProfileCache(userId);

//     // Format response
//     const response = formatResponse(profile);

//     // return res.json({
//     //   success: true,
//     //   message: "ID document uploaded successfully. Your submission is under review.",
//     //   data: response
//     // });

//     return res.json({
//       success: true,
//       message: "ID document uploaded successfully. Your verification is under review",
//       data: {
//         idDocument: {
//           type: profile.kyc.idDocument.type, // ✅ ID type
//           frontUrl: profile.kyc.idDocument.frontUrl, // ✅ Front URL
//           backUrl: profile.kyc.idDocument.backUrl, // ✅ Back URL (if exists)
//           uploadedAt: profile.kyc.idDocument.uploadedAt
//         },
//         kycStatus: profile.kyc.status,
//         kycMessage: profile.kyc.status === "pending"
//           ? "Your verification is under review. This usually takes 24-48 hours"
//           : "Please upload selfie to submit for verification",
//         progress: response.progress,
//         nextStep: response.nextStep
//       }
//     });

//   } catch (err) {
//     console.error("Upload ID error:", err);
//     return res.status(500).json({
//       success: false,
//       code: "UPLOAD_FAILED",
//       message: err.message
//     });
//   }
// };


module.exports.uploadIDDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const files = req.files;

    // 1️⃣ Front image required
    if (!files || !files.front || !files.front[0]) {
      return res.status(400).json({
        success: false,
        message: "Document front image is required"
      });
    }

    const frontFile = files.front[0];

    // 2️⃣ File validation
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimes.includes(frontFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only JPG and PNG images are allowed"
      });
    }

    if (frontFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Image size must be less than 5MB"
      });
    }

    // 3️⃣ Get profile
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // 4️⃣ Upload document
    const uploadResult = await uploadStream(frontFile.buffer, {
      folder: `mafs/users/${userId}/kyc`,
      transformation: [
        { width: 1200, height: 800, crop: "limit", quality: "auto:best" }
      ]
    });

    // 5️⃣ Ensure verification object exists
    if (!profile.verification) profile.verification = {};

    // 6️⃣ Save doc URL (AS PER DB MODEL)
    profile.verification.docUrl = uploadResult.secure_url;

    // 7️⃣ Status logic (selfie + doc)
    if (profile.verification.selfieUrl) {
      profile.verification.status = "pending";
    } else {
      profile.verification.status = "not_started";
    }
    const user = await User.findById(userId).lean();
       const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
      let subData = await UserSubscription.findOne({ userId });
      if (!subData) {
        // Naya user hai toh default create karo
        subData = await UserSubscription.create({ userId});
      }
      // Reset counters if it's a new day
      subData.resetIfNeeded()
      // await redis.del(redisKey);
    // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

    // 8️⃣ Save profile
    await profile.save();

    // 9️⃣ Clear cache if exists
    if (typeof clearProfileCache === "function") {
      await clearProfileCache(userId);
    }

    return res.json({
      success: true,
      message: "ID document uploaded successfully. Verification is under review.",
      data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
      } 
    });

  } catch (err) {
    console.error("Upload ID error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload ID document",
      error: err.message
    });
  }
};
module.exports.getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ userId })
      .select("verification")
      .lean();

    if (!profile || !profile.verification) {
      return res.json({
        success: true,
        data: {
          status: "not_started",
          selfieUploaded: false,
          documentUploaded: false,
          rejectionReason: null,
          message: "Verification not started"
        }
      });
    }

    const { status, selfieUrl, docUrl, rejectionReason } =
      profile.verification;

    // Status based message (frontend-friendly)
    let message = "Verification not started";

    if (status === "pending") {
      message = "Your verification is under review";
    } else if (status === "approved") {
      message = "Your profile has been verified";
    } else if (status === "rejected") {
      message = "Your verification was rejected";
    }

    return res.json({
      success: true,
      data: {
        status,
        selfieUploaded: Boolean(selfieUrl),
        documentUploaded: Boolean(docUrl),
        rejectionReason: status === "rejected" ? rejectionReason || "Verification failed" : null,
        message
      }
    });

  } catch (err) {
    console.error("Get verification status error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch verification status"
    });
  }
};




// module.exports.uploadIDDocument = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const files = req.files;
//     const { idType } = req.body;

//     if (!files || !files.front) {
//       return res.status(400).json({ success: false, message: "ID front image is required" });
//     }

//     if (!idType) {
//       return res.status(400).json({ success: false, message: "ID type is required" });
//     }

//     // Get profile
//     let profile = await Profile.findOne({ userId }); // Make sure Profile is imported

//     // 1. Upload Front Image
//     const frontResult = await uploadStream(files.front[0].buffer, {
//       folder: `mafs/users/${userId}/kyc`,
//       transformation: [{ width: 1200, height: 800, crop: "limit", quality: "auto:best" }]
//     });

//     // --- NEW MODEL MAPPING START ---
//     // Initialize verification if not exists
//     if (!profile.verification) profile.verification = {};
    
//     // Save to the NEW field: docUrl (as per manager's structure)
//     profile.verification.docUrl = frontResult.secure_url;
//     // (Optional) If you want to keep track of type/publicId, you can store them in hidden fields or metadata
    
//     // Also keeping the old 'kyc' structure for internal tracking if needed, 
//     // but the main data goes to 'verification'
//     profile.kyc = {
//       ...profile.kyc,
//       idDocument: {
//         type: idType,
//         frontUrl: frontResult.secure_url,
//         frontPublicId: frontResult.public_id,
//         uploadedAt: new Date()
//       }
//     };

//     // 2. Upload Back Image (if provided)
//     if (files.back && files.back[0]) {
//       const backResult = await uploadStream(files.back[0].buffer, {
//         folder: `mafs/users/${userId}/kyc`,
//         transformation: [{ width: 1200, height: 800, crop: "limit", quality: "auto:best" }]
//       });
//       profile.kyc.idDocument.backUrl = backResult.secure_url;
//       profile.kyc.idDocument.backPublicId = backResult.public_id;
//     }

//     // 3. Update KYC Status & Onboarding Flag
//     profile.onboardingProgress.idDocumentUploaded = true;

//     // Trigger 'pending' status ONLY IF selfie is also there
//     // Selfie check (new model path): profile.verification.selfieUrl
//     if (profile.verification.selfieUrl || (profile.kyc && profile.kyc.selfie && profile.kyc.selfie.url)) {
//       profile.verification.status = "pending";
//       profile.kyc.status = "pending"; // sync both for safety
//     }

//     //   const blockedContacts = await BlockedContact.find({ userId }).lean();
//     // const formatted = formatProfileResponse(profile, blockedContacts);


//       const user = await User.findById(userId).lean();
//      const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);
//     let subData = await UserSubscription.findOne({ userId });
//       if (!subData) {
//         // Naya user hai toh default create karo
//         subData = await UserSubscription.create({ userId});
//       }
//       // Reset counters if it's a new day
//       subData.resetIfNeeded()
//       // await redis.del(redisKey);
//     // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);


//     // 4. Save (This will trigger the Pre-save hook we wrote for totalCompletion)
//     await profile.save();

//     // 5. Cleanup & Response
//     if (typeof clearProfileCache === 'function') await clearProfileCache(userId);

//  res.json({  success: true,
//        message: "ID document uploaded successfully. Your verification is under review", data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } });
//   } catch (err) {
//     console.error("Upload ID error:", err);
//     return res.status(500).json({ success: false, code: "UPLOAD_FAILED", message: err.message });
//   }
// };
// ========================================
// 6. UPDATE LOCATION
// ========================================

module.exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { latitude, longitude, city, state, country,full_address } = req.body || {};
    console.log("address,country,state,city",full_address,country,state,city)
    console.log("METHOD:", req.method);
console.log("HEADERS:", req.headers);
console.log("BODY:", req.body);


    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
  return res.status(400).json({
    success: false,
    message: "Valid latitude and longitude are required"
  });
}
  const user = await User.findById(userId).lean();
  
    let profile = await getOrCreateProfile(userId);

    // Update location
    profile.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
      city: city || "",
      state: state || "",
      country: country || "",
      full_address : full_address || ""
    };

     const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);
   
    await profile.save();

    // Clear cache
    await clearProfileCache(userId);

    // Format response
    // const response = formatResponse(profile);

    return res.json({
      success: true,
      message: "Location updated successfully",
       data: {
        user: formatProfileResponse(user,profile, blockedContacts,blockedUser)
      }
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
    // const response = formatResponse(profile);

      const blockedContacts = await BlockedContact.find({ userId }).lean();
    const formatted = formatProfileResponse(profile, blockedContacts);

    // Cache for 30 seconds
    try {
      await cache.set(cacheKey, JSON.stringify(formatted), { EX: 30 });
    } catch (cacheErr) {
      console.log("Cache write warning:", cacheErr.message);
    }

    return res.json({
      success: true,
      data: formatted,
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
// module.exports.getMyProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await Profile.findOne({ userId }).lean();

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     return res.json({
//       success: true,
//       data: profile
//     });

//   } catch (err) {
//     console.error("Get profile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// ========================================
// 9. GET PUBLIC PROFILE
// ========================================
// module.exports.getPublicProfile = async (req, res) => {
//   try {
//     const targetUserId = req.params.userId;

//     const profile = await Profile.findOne({
//       userId: targetUserId,
//       isDiscoverable: true
//     })
//       .select("-preferences -kyc -onboardingProgress")
//       .lean();

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found or not discoverable"
//       });
//     }

//     return res.json({
//       success: true,
//       data: profile
//     });

//   } catch (err) {
//     console.error("Get public profile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// const Match = require("../matches/swipe/swipe.model");



// module.exports.getPublicProfile = async (req, res) => {
//   try {
//     const viewerId = req.user._id.toString();
//     const targetUserId = req.params.userId;

//     console.log("Viewer ID:", viewerId)
//     console.log("Target User ID:", targetUserId)
    
//     const profile = await Profile.findOne({ userId: targetUserId })
//       .select("-preferences -kyc -onboardingProgress")
//       .lean();

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     // 🔒 VISIBILITY LOGIC
//     if (profile.visibility === "nobody") {
//       return res.status(403).json({
//         success: false,
//         code: "PROFILE_HIDDEN",
//         message: "This profile is not visible"
//       });
//     }

//     if (profile.visibility === "matches_only") {
//       // ✅ CORRECT FIX: new keyword ke saath
//       const mongoose = require('mongoose');
//       const isMatch = await Match.exists({
//         users: { 
//           $all: [
//             new mongoose.Types.ObjectId(viewerId),
//             new mongoose.Types.ObjectId(targetUserId)
//           ] 
//         }
//       });

//       console.log("isMatch value:", isMatch);
      
//       if (!isMatch) {
//         return res.status(403).json({
//           success: false,
//           code: "MATCH_REQUIRED",
//           message: "Only matches can view this profile"
//         });
//       }
//     }
   
//     return res.json({
//       success: true,
//       data: profile
//     });

//   } catch (err) {
//     console.error("Get public profile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };






// module.exports.getPublicProfile = async (req, res) => {
//   try {
//     const viewerId = req.user._id.toString();   // 🔥 convert to string
//     const targetUserId = req.params.userId;     // already string

//     console.log("Viewer ID:", viewerId)
//     console.log("Target User ID:", targetUserId)
//     const profile = await Profile.findOne({ userId: targetUserId })
//       .select("-preferences -kyc -onboardingProgress")
//       .lean();

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     // 🔒 VISIBILITY LOGIC
//     if (profile.visibility === "nobody") {
//       return res.status(403).json({
//         success: false,
//         code: "PROFILE_HIDDEN",
//         message: "This profile is not visible"
//       });
//     }
//   const isMatch = await Match.exists({
//         users: { $all: [viewerId, targetUserId] } // ✅ STRING vs STRING
//       });

//       console.log("isMatch value :",isMatch)
//    if (!isMatch) {
//         return res.status(403).json({
//           success: false,
//           code: "MATCH_REQUIRED",
//           message: "Only matches can view this profile"
//         });
//       }
   
//     return res.json({
//       success: true,
//       data: profile
//     });

//   } catch (err) {
//     console.error("Get public profile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };



// modules/profile/profile.controller.js

// const BlockedContact = require("../BlockedContact/blockedContacts.model");
// const { formatProfileResponse } = require("./profile.formatter");

// module.exports.getMyProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // 1️⃣ Profile fetch
//     const profile = await Profile.findOne({ userId }).lean();
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     // 2️⃣ Blocked contacts (separate schema)
//     const blockedContacts = await BlockedContact.find(
//       { userId },
//       { blockedPhoneHash: 1, _id: 0 }
//     ).lean();

//     // 3️⃣ Format response
//     const formattedProfile = formatProfileResponse(
//       profile,
//       blockedContacts
//     );

//     return res.json({
//       success: true,
//       data: formattedProfile
//     });

//   } catch (err) {
//     console.error("❌ Get profile error:", err); // VERY IMPORTANT
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch profile"
//     });
//   }
// };







// const BlockedContact = require("../BlockedContact/blockedContacts.model");

// const { formatProfileRespon } = require("./profile.formatter");

// module.exports.getMyProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await Profile.findOne({ userId }).lean();
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     const formattedProfile = formatProfileResponse(profile);

//     return res.json({
//       success: true,
//       data: formattedProfile
//     });

//   } catch (err) {
//     console.error("❌ Get profile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch profile"
//     });
//   }
// };




// module.exports.getMyProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await Profile.findOne({ userId }).lean();
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }
//    const blockedContacts = await BlockedContact.find(
//       { userId },
//       { blockedPhoneHash: 1, _id: 0 }
//     ).lean();
//     // req.user se email / phone aa raha hoga
//     const formattedProfile = formatProfileResponse(profile, req.user,blockedContacts);

//     return res.json({
//       success: true,
//       data: formattedProfile
//     });

//   } catch (err) {
//     console.error("Get profile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };


const { formatPublicProfile } = require("./profile.userFormatter");
const swipeModel = require("../matches/swipe/swipe.model");

// exports.getUserProfile = async (req, res) => {
//   try {
//     // Params se 'userId' nikalo (kyunki aapke route mein :userId hai)
//     const { userId } = req.params; 
    
//     console.log("Searching for Profile with userId:", userId);

//     // Lean query performance ke liye
//     const profile = await Profile.findOne({ userId: userId }).lean();
    
//     if (!profile) {
//       console.log("Profile not found for ID:", userId);
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }

//     // Baaki logic same...
//     const formattedData = await formatPublicProfile(req.user, profile);

//     res.json({ success: true, data: formattedData });
    
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };


exports.getUserProfile = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params; // Jiski profile dekhni hai
        const viewer = req.user; // Jo user dekh raha hai (token se)

        // 1. Database se target user ki poori profile nikalo
        const targetProfile = await Profile.findOne({ userId: targetUserId }).lean();
        
        if (!targetProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // 2. Parallel Checks (Interaction History)
        const [swipeAction, blockStatus] = await Promise.all([
            swipeModel.findOne({ swiperId: viewer._id, targetId: targetUserId }).lean(),
            Block.findOne({
                $or: [
                    { blockerId: viewer._id, blockedId: targetUserId },
                    { blockerId: targetUserId, blockedId: viewer._id }
                ]
            }).lean()
        ]);

        // 3. Privacy Guard: Agar block hai toh profile nahi dikhegi
        if (blockStatus) {
            return res.status(403).json({ success: false, message: "Profile is private or unavailable" });
        }

        // 4. Universal Formatter Call
        const formattedData = await formatPublicProfile(viewer, targetProfile, swipeAction);

        res.json({
            success: true,
            data: formattedData
        });

    } catch (err) {
        console.error("Fetch Profile Error:", err);
        res.status(500).json({ success: false, message: "Failed to load profile details" });
    }
};
exports.updateDiscoveryFilters = async (req, res) => {
  try {
    const userId = req.user._id;
    const { discoveryFilters } = req.body; 

    let profile = await Profile.findOne({ userId });

    if (discoveryFilters) {
      // ✅ INTERESTS: Sneha ke interests yahan save honge
      if (discoveryFilters.interests) {
          profile.discovery.preferredInterests = discoveryFilters.interests;
      }
      
      if (discoveryFilters.relationshipGoal) {
          profile.discovery.filterRelationshipGoal = discoveryFilters.relationshipGoal;
      }
      
      // ✅ AGE RANGE: Sneha (25) ko target karne ke liye
      if (discoveryFilters.ageRange) {
          profile.discovery.ageRange = discoveryFilters.ageRange;
      }
      if (discoveryFilters.advanced) {
    profile.discovery.advancedFilters = {
        ...profile.discovery.advancedFilters,
        ...discoveryFilters.advanced
    };
}
    }

    await profile.save();

    // 🔥 SABSE ZAROORI: Redis key delete karo taaki Nayi Feed DB se aaye
    if (redis) {
        const CACHE_KEY = `feed:${userId.toString()}`;
        await redis.del(CACHE_KEY);
        console.log("Redis cache cleared for new filters");
    }

    return res.json({ success: true, message: "Filters applied! Feed is refreshing." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// module.exports.getPublicProfile = async (req, res) => {
//   try {
//     const mongoose = require('mongoose');
//     const viewerId = req.user._id; // Already ObjectId
//     const targetUserId = req.params.userId; // String format

//     console.log("Viewer ID:", viewerId);
//     console.log("Target User ID:", targetUserId);
    
//     const profile = await Profile.findOne({ userId: targetUserId })
//       .select("-preferences -kyc -onboardingProgress")
//       .lean();

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     // 🔒 VISIBILITY LOGIC
//     if (profile.visibility === "nobody") {
//       return res.status(403).json({
//         success: false,
//         code: "PROFILE_HIDDEN",
//         message: "This profile is not visible"
//       });
//     }

//     if (profile.visibility === "matches_only") {
//       // ✅ Convert both to ObjectId properly
//       const viewerObjectId = mongoose.Types.ObjectId.isValid(viewerId) 
//         ? new mongoose.Types.ObjectId(viewerId) 
//         : viewerId;
      
//       const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

//       console.log("Viewer ObjectId:", viewerObjectId);
//       console.log("Target ObjectId:", targetObjectId);

//       // ✅ Array order matter karta hai, so $or use karo
//       const isMatch = await Match.findOne({
//         $or: [
//           { users: [viewerObjectId, targetObjectId] },
//           { users: [targetObjectId, viewerObjectId] }
//         ]
//       });

//       console.log("Match found:", isMatch);
      
//       if (!isMatch) {
//         return res.status(403).json({
//           success: false,
//           code: "MATCH_REQUIRED",
//           message: "Only matches can view this profile"
//         });
//       }
//     }
   
//     return res.json({
//       success: true,
//       data: profile
//     });

//   } catch (err) {
//     console.error("Get public profile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };



// exports.updateDiscoveryPreference = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const body = req.body;

//     const update = {};

//     // =========================
//     // HARD FILTERS (MANDATORY)
//     // =========================
//     if (body.preferences) {
//       if (body.preferences.ageRange)
//         update["preferences.ageRange"] = body.preferences.ageRange;

//       if (body.preferences.distanceRange)
//         update["preferences.distanceRange"] = body.preferences.distanceRange;

//       if (body.preferences.genderPreference)
//         update["preferences.genderPreference"] = body.preferences.genderPreference;
//     }

//     // =========================
//     // SOFT FILTERS (OPTIONAL)
//     // =========================
//   if (body.discoveryFilters) {
//   if (body.discoveryFilters.hasBio !== undefined)
//     update["discoveryFilters.hasBio"] = body.discoveryFilters.hasBio;

//   if (body.discoveryFilters.interests)
//     update["discoveryFilters.interests"] = body.discoveryFilters.interests;

//   if (body.discoveryFilters.relationshipGoals)
//     update["discoveryFilters.relationshipGoals"] =
//       body.discoveryFilters.relationshipGoals;

//   if (body.discoveryFilters.basics)
//     update["discoveryFilters.basics"] = body.discoveryFilters.basics;

//   if (body.discoveryFilters.lifestyle)
//     update["discoveryFilters.lifestyle"] = body.discoveryFilters.lifestyle;
// }


//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { $set: update },
//       { new: true }
//     );

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         message: "Profile not found"
//       });
//     }

//     return res.json({
//       success: true,
//       message: "Discovery preference updated successfully",
//       data: {
//         preferences: profile.preferences,
//         discoveryFilters: profile.discoveryFilters
//       }
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message
//     });
//   }
// };


// exports.updateDiscoveryPreference = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const body = req.body;

//     // Get Profile first to use .save() so our Pre-save Hook triggers
//     let profile = await Profile.findOne({ userId });

//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }

//     // ==========================================
//     // 1. HARD FILTERS (Mapped to 'discovery')
//     // ==========================================
//     if (body.preferences) {
//       const { ageRange, distanceRange, genderPreference, relationshipGoal } = body.preferences;

//       if (ageRange) profile.discovery.ageRange = ageRange;
//       if (distanceRange) profile.discovery.distanceRange = distanceRange;
//       if (genderPreference) profile.discovery.showMeGender = genderPreference; // Mapped to showMeGender
//       if (relationshipGoal) profile.discovery.relationshipGoal = relationshipGoal;
//     }

//     // ==========================================
//     // 2. SOFT FILTERS (Mapped to 'attributes')
//     // ==========================================
//     if (body.discoveryFilters) {
//       const df = body.discoveryFilters;

//       // Agar user specific lifestyle ya basics ke basis par filter karna chahta hai
//       // Toh hum unhe discovery settings mein store karenge feed query ke liye
//       if (df.interests) profile.discovery.preferredInterests = df.interests;
//       if (df.lifestyle) profile.discovery.lifestyleFilters = df.lifestyle;
//       if (df.hasBio !== undefined) profile.discovery.mustHaveBio = df.hasBio;
//     }

//     // IMPORTANT: Use .save() instead of findOneAndUpdate 
//     // Taaki humara 'pre-save' hook chale aur completion percentage update ho
//     await profile.save();

//     return res.json({
//       success: true,
//       message: "Discovery preferences updated and synced with Feed Engine",
//       data: {
//         discovery: profile.discovery,
//         totalCompletion: profile.onboardingProgress.totalCompletion
//       }
//     });

//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };


// exports.updateDiscoveryFilters = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { discoveryFilters } = req.body; // Alag object

//     let profile = await Profile.findOne({ userId });

//     if (discoveryFilters) {
//       // 1. Common Filters
//       if (discoveryFilters.interests) profile.discovery.preferredInterests = discoveryFilters.interests;
//       if (discoveryFilters.hasBio !== undefined) profile.discovery.hasBio = discoveryFilters.hasBio;
      
//       // 2. Relationship Goal (As a filter, not profile data)
//       if (discoveryFilters.relationshipGoal) {
//         profile.discovery.filterRelationshipGoal = discoveryFilters.relationshipGoal;
//       }

//       // 3. Advanced Traits (Merging carefully)
//       if (discoveryFilters.advanced) {
//         profile.discovery.advancedFilters = {
//           ...profile.discovery.advancedFilters,
//           ...discoveryFilters.advanced
//         };
//       }
//     }

//     await profile.save();
//     return res.json({ success: true, message: "Filters applied! Feed is refreshing." });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.updateDiscoveryPreference = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { preferences, discoveryFilters } = req.body;

//     let profile = await Profile.findOne({ userId });
//     if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

//     // 1. Core Preferences Mapping
//     if (preferences) {
//       if (preferences.distanceRange) profile.discovery.distanceRange = preferences.distanceRange;
//       if (preferences.ageRange) profile.discovery.ageRange = preferences.ageRange;
//       if (preferences.genderPreference) profile.discovery.showMeGender = preferences.genderPreference;
//       if (preferences.relationshipGoal) profile.discovery.relationshipGoal = preferences.relationshipGoal;
//     }

//     // 2. Advanced Filters Mapping (Figma Screenshot)
//     if (discoveryFilters) {
//       // "Has a Bio" checkbox
//       if (discoveryFilters.hasBio !== undefined) profile.discovery.hasBio = discoveryFilters.hasBio;
      
//       // Preferred Interests Chips
//       if (discoveryFilters.interests) profile.discovery.preferredInterests = discoveryFilters.interests;
      
//       // Advanced Basics & Lifestyle (Zodiac, Education, etc.)
//       if (discoveryFilters.advanced) {
//         // Purane filters ko naye filters ke saath merge karega bina delete kiye
//         profile.discovery.advancedFilters = {
//           ...profile.discovery.advancedFilters,
//           ...discoveryFilters.advanced
//         };
//       }
//     }

//     // Flag for onboarding completion
//     profile.onboardingProgress.discoveryPreferenceSet = true;

//     // Save triggers the pre-save hook for totalCompletion
//     await profile.save();

//     return res.json({
//       success: true,
//       message: "Discovery filters applied. Your feed is refreshing!",
//       data: { discovery: profile.discovery, totalCompletion: profile.onboardingProgress.totalCompletion }
//     });
//   } catch (err) {
//     console.error("Discovery Update Error:", err);
//     return res.status(500).json({ success: false, message: "Failed to update preferences" });
//   }
// };




exports.getDiscoveryPreference = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id })
      .select('preferences discoveryFilters')
      .lean();
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }
    return res.json({
      success: true,
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


// exports.updateVisibility = async (req, res) => {
//   try {
//     const { visibility } = req.body;
//     const userId = req.user._id;

//     // Validate input
//     if (!["everyone", "matches_only", "nobody"].includes(visibility)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid visibility setting. Must be one of: everyone, matches_only, nobody"
//       });
//     }

//     // Update profile
//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       { 
//         $set: { 
//           visibility,
//           // For backward compatibility
//           isDiscoverable: visibility !== "nobody" 
//         } 
//       },
//       { new: true, runValidators: true }
//     );

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         message: "Profile not found"
//       });
//     }

//     // Clear any cached profile data
//     await clearProfileCache(userId);

//     return res.json({
//       success: true,
//       message: "Visibility updated successfully",
//       data: {
//         visibility: profile.visibility,
//         isDiscoverable: profile.isDiscoverable
//       }
//     });

//   } catch (error) {
//     console.error("Error updating visibility:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to update visibility settings",
//       error: error.message
//     });
//   }
// };

// // Helper function to clear profile cache
// async function clearProfileCache(userId) {
//   // Implement your cache clearing logic here if you're using caching
//   // Example: await cache.del(`profile:${userId}`);
// }



// controllers/profile.controller.js

exports.updateVisibility = async (req, res) => {
  try {
    const userId = req.user._id;
    const { globalVisibility } = req.body;

    // 1️⃣ Validation
    const allowed = ["everyone", "matches_only", "nobody"];
    if (!allowed.includes(globalVisibility)) {
      return res.status(400).json({
        success: false,
        message: "Invalid globalVisibility value"
      });
    }

    // 2️⃣ Decide system flags
    let isDiscoverable = true;
    let canAccessSwipe = true;

    if (globalVisibility === "nobody") {
      isDiscoverable = false;
      canAccessSwipe = false;
    }

    // 3️⃣ Update profile
    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        $set: {
          "discovery.globalVisibility": globalVisibility,
          isDiscoverable,
          canAccessSwipe,
          lastProfileUpdate: new Date()
        }
      },
      { new: true }
    ).select("discovery.globalVisibility isDiscoverable canAccessSwipe");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    if(redis){
      await redis.del(`feed:${userId.toString()}`);
    }
    
    // // 4️⃣ Feed cache clear (VERY IMPORTANT 🔥)
    // await redis?.del(`feed:${userId}`);

    return res.json({
      success: true,
      message: "Visibility updated successfully",
      data: {
        globalVisibility: profile.discovery.globalVisibility,
        isDiscoverable: profile.isDiscoverable,
        canAccessSwipe: profile.canAccessSwipe
      }
    });

  } catch (err) {
    console.error("Update visibility error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};





exports.quickVerifyUser = async (req, res) => {
  try {
    const { userId } = req.params; // Aap yahan Profile ki ID ya User ki ID bhej sakte ho

    // 1. Profile Update (Nested Fields)
    // Humne isse aisa banaya hai ki ye Profile _id ya userId dono se dhoond sake
    const updatedProfile = await Profile.findOneAndUpdate(
      { $or: [{ _id: userId }, { userId: userId }] },
      {
        $set: {
          "canAccessSwipe": true,
          "isDiscoverable": true,
          "isProfileComplete": true,
          "isMandatoryComplete": true,
          "verification.status": "approved",
        }
      },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    // // 2. User Update (User Model ke flags)
    // await User.findByIdAndUpdate(updatedProfile.userId, {
    //   $set: {
    //     "onboarding.isComplete": true,
    //     isPhoneVerified: true,
    //     isNewUser: false,
    //     accountStatus: "active"
    //   }
    // });

    res.json({
      success: true,
      message: "🚀 Sab kuch set hai! Swipe and Discover enabled.",
      data: {
          profileId: updatedProfile._id,
          // userId: updatedProfile.userId,
          canSwipe: updatedProfile.attributes.canAccessSwipe,
          isDiscoverable: updatedProfile.discovery.isDiscoverable,
          kyc: updatedProfile.verification.status
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



