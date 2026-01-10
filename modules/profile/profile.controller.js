// /* eslint-disable no-unused-vars */
// const Profile = require("./profile.model");
// const cache = require("../../config/cache");
// const { uploadStream, destroy } = require("../upload/cloudinary.service");
// const redis = require("../../config/cache");
// const User = require("../auth/auth.model");

// async function getOrCreateProfile(userId) {
//   let profile = await Profile.findOne({ userId });

//   if (!profile) {
//     // Create empty profile
//     profile = await Profile.create({
//       userId,
//       onboardingStartedAt: new Date()
//     });
//   }

//   return profile;
// }
// async function clearProfileCache(userId) {
//   try {
//     await cache.del(`profile:${userId}`);
//     await cache.del(`profile:status:${userId}`);
//   } catch (err) {
//     console.log("Cache clear warning:", err.message);
//   }
// }
// const BlockedContact = require("../BlockedContact/blockedContacts.model");
// const Block = require("../profile/user.block")
// const { formatProfileResponse } = require("./profile.formatter");
// const UserSubscription = require("../auth/UserSubscription.model")

// exports.updateProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const updateData = req.body;
//     let profile = await Profile.findOne({ userId });

//     if (!profile) {
//       return res.status(404).json({ success: false, message: "Profile not found" });
//     }
//     if (updateData.profile) {
//       const p = updateData.profile;
//       const basicFields = ['nickname', 'dob', 'gender', 'height', 'about', 'jobTitle', 'company', 'school', 'pronouns', 'weight'];
      
//       basicFields.forEach(field => {
//         if (p[field] !== undefined) profile[field] = p[field];
//       });
//       if (p.nickname) {
//         const existing = await Profile.findOne({ nickname: p.nickname, userId: { $ne: userId } });
//         if (existing) return res.status(400).json({ success: false, code: "NICKNAME_TAKEN", message: "Nickname taken" });
//       }
//     }
//     if (updateData.attributes) {
//       const attr = updateData.attributes;
//       profile.attributes = profile.attributes || {};
      
//       const traitFields = [
//         'zodiac', 'education', 'familyPlans', 'personalityType', 'communicationStyle', 
//         'loveStyle', 'bloodType', 'covidVaccine', 'religion', 'pets', 'drinking', 
//         'smoking', 'workout', 'dietary', 'sleeping', 'socialMedia'
//       ];

//       traitFields.forEach(field => {
//         if (attr[field] !== undefined) profile.attributes[field] = attr[field];
//       });
//       const arrayTraits = ['languages', 'interests', 'music', 'movies', 'books', 'travel'];
//       arrayTraits.forEach(field => {
//         if (attr[field] !== undefined) profile.attributes[field] = Array.isArray(attr[field]) ? attr[field] : [attr[field]];
//       });
//     }
//     if (updateData.discovery) {
//       const disc = updateData.discovery;
//       profile.discovery = profile.discovery || {};

//       if (disc.distanceRange) profile.discovery.distanceRange = disc.distanceRange;
//       if (disc.relationshipGoal) profile.discovery.relationshipGoal = disc.relationshipGoal;
//       if (disc.globalVisibility) profile.discovery.globalVisibility = disc.globalVisibility;
      
//       if (disc.ageRange) {
//         profile.discovery.ageRange = {
//           min: disc.ageRange.min || profile.discovery.ageRange.min,
//           max: disc.ageRange.max || profile.discovery.ageRange.max
//         };
//       }

//       if (disc.showMeGender) {
//         profile.discovery.showMeGender = Array.isArray(disc.showMeGender) ? disc.showMeGender : [disc.showMeGender];
//       }
//     }
//      const user = await User.findById(userId).lean();
//     profile.lastProfileUpdate = new Date();
//     await profile.save();
//     const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);
//     let subData = await UserSubscription.findOne({ userId });
//       if (!subData) {
//         // Naya user hai toh default create karo
//         subData = await UserSubscription.create({ userId});
//       }
//       subData.resetIfNeeded()
//     res.json({ success: true, message: "Profile updated successfully" ,  data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } });
//   } catch (error) {
//     console.error("Update Error:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };
// exports.getMyProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const profile = await Profile.findOne({ userId });
    
//     if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });


//    const user = await User.findById(userId).lean();
//      const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);
//     let subData = await UserSubscription.findOne({ userId });
//       if (!subData) {
//         // Naya user hai toh default create karo
//         subData = await UserSubscription.create({ userId});
//       }
//       subData.resetIfNeeded()
//     res.json({ success: true ,  data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to fetch profile" });
//   }
// };
// module.exports.uploadPhotos = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const files = req.files;

//     if (!files || files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No files uploaded"
//       });
//     }
//     let profile = await getOrCreateProfile(userId);
//     if (profile.photos.length + files.length > 6) {
//       return res.status(400).json({
//         success: false,
//         message: `Maximum 6 photos allowed. You have ${profile.photos.length} photo(s).`
//       });
//     }
//     const uploadPromises = files.map(async (file) => {
//       const result = await uploadStream(file.buffer, {
//         folder: `mafs/users/${userId}/photos`,
//         transformation: [
//           { width: 1080, height: 1350, crop: "fill", quality: "auto:good" }
//         ]
//       });

//       return {
//         url: result.secure_url,
//         publicId: result.public_id,
//         width: result.width,
//         height: result.height,
//         format: result.format,
//         bytes: result.bytes,
//         uploadedAt: new Date()
//       };
//     });
//     const newPhotos = await Promise.all(uploadPromises);
//     newPhotos.forEach((photo, index) => {
//       profile.photos.push({
//         ...photo,
//         order: profile.photos.length + index + 1,
//         isPrimary: profile.photos.length === 0 && index === 0 // First photo is primary
//       });
//     });
//     await profile.save();
//     await clearProfileCache(userId);
// const user = await User.findById(userId).lean();
//      const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);
//     let subData = await UserSubscription.findOne({ userId });
//       if (!subData) {
//         // Naya user hai toh default create karo
//         subData = await UserSubscription.create({ userId});
//       }
//       subData.resetIfNeeded()
//     res.json({  success: true,
//       message: `${newPhotos.length} photo uploaded successfully`,  data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } });



//   } catch (err) {
//     console.error("Upload photos error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to upload photos. Please try again"
//     });
//   }
// };
// module.exports.deletePhoto = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { publicId } = req.body;

//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     const photoIndex = profile.photos.findIndex(p => p.publicId === publicId);
//     if (photoIndex === -1) {
//       return res.status(404).json({
//         success: false,
//         code: "PHOTO_NOT_FOUND",
//         message: "Photo not found"
//       });
//     }

//     // Delete from Cloudinary
//     await destroy(publicId);

//     // Remove from profile
//     profile.photos.splice(photoIndex, 1);

//     // Reorder remaining photos
//     profile.photos.forEach((photo, index) => {
//       photo.order = index + 1;
//       if (index === 0) photo.isPrimary = true;
//       else photo.isPrimary = false;
//     });

//     // Save
//     await profile.save();

//     // Clear cache
//     await clearProfileCache(userId);

//     const user = await User.findById(userId).lean();
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

//     res.json({  success: true,
//       message: "photo deleted successfully",  data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } });


//   } catch (err) {
//     console.error("Delete photo error:", err);
//     return res.status(500).json({
//       success: false,
//       code: "DELETE_FAILED",
//       message: err.message
//     });
//   }
// };

// module.exports.reorderPhotos = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { photoIds } = req.body;

//     // 1️⃣ Validation
//     if (!Array.isArray(photoIds) || photoIds.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "photoIds array is required"
//       });
//     }

//     // 2️⃣ Profile fetch
//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         code: "PROFILE_NOT_FOUND",
//         message: "Profile not found"
//       });
//     }

//     // 3️⃣ Length validation (security check)
//     if (photoIds.length !== profile.photos.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Photo count mismatch"
//       });
//     }

//     // 4️⃣ Create map for fast lookup
// const photoMap = new Map();
// profile.photos.forEach(photo => {
//   // toString() use karo taaki comparison mein issue na aaye
//   photoMap.set(photo.publicId.toString(), photo);
// });

// // 5️⃣ Validate all photoIds exist
// for (const id of photoIds) {
//   // Trim aur string check
//   if (!photoMap.has(id.trim())) {
//     console.log("Map Keys:", Array.from(photoMap.keys())); // Debugging ke liye
//     console.log("Looking for:", id);
    
//     return res.status(400).json({
//       success: false,
//       message: `Invalid photoId: ${id}. Make sure it matches publicId exactly.`
//     });
//   }
// }
//     const reorderedPhotos = photoIds.map((id, index) => {
//       const photo = photoMap.get(id);

//       return {
//         ...photo.toObject(),
//         order: index + 1,
//         isPrimary: index === 0 // first photo becomes primary
//       };
//     });

//     profile.photos = reorderedPhotos;
//     const user = await User.findById(userId).lean();
//      const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);
//     let subData = await UserSubscription.findOne({ userId });
//       if (!subData) {
//         // Naya user hai toh default create karo
//         subData = await UserSubscription.create({ userId});
//       }
//       subData.resetIfNeeded()
//     await profile.save();

//     await clearProfileCache(userId);
    
//     res.json({  success: true,
//       message: "Photos reordered successfully",  data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } });

//   } catch (err) {
//     console.error("Reorder photos error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to reorder photos"
//     });
//   }
// };
// module.exports.uploadSelfie = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const file = req.file;

   

//     if (!file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded"
//       });
//     }

//     // Get profile
//     let profile = await getOrCreateProfile(userId);

//      if(profile.verification === "approved") return "profile already approved"

//     // Upload to Cloudinary
//     const result = await uploadStream(file.buffer, {
//       folder: `mafs/users/${userId}/kyc`,
//       transformation: [
//         { width: 800, height: 800, crop: "fill", quality: "auto:best" }
//       ]
//     });

//     // Update profile
//     // if (!profile.kyc) profile.kyc = {};

//     // profile.kyc.selfie = {
//     //   url: result.secure_url,
//     //   publicId: result.public_id,
//     //   uploadedAt: new Date()
//     // };

//     // // Update KYC status
//     // if (profile.kyc.status === "not_started") {
//     //   profile.kyc.status = "pending";
//     // }
//     profile.verification.selfieUrl = result.url;
// profile.verification.status = "pending"; 
  

// await profile.save();

//     // Save

//     // Clear cache
//     await clearProfileCache(userId);

//     // Format response
//     // const response = formatResponse(profile);

//     // return res.json({
//     //   success: true,
//     //   message: "Selfie uploaded successfully",
//     //   data: response
//     // });

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

//     res.json({  success: true,
//       message: "Selfie uploaded successfully",  data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } });

//   } catch (err) {
//     console.error("Upload selfie error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to upload selfie. Please try again"
//     });
//   }
// };

// module.exports.uploadIDDocument = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const files = req.files;

//     // 1️⃣ Front image required
//     if (!files || !files.front || !files.front[0]) {
//       return res.status(400).json({
//         success: false,
//         message: "Document front image is required"
//       });
//     }

//     const frontFile = files.front[0];

//     // 2️⃣ File validation
//     const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
//     const maxSize = 5 * 1024 * 1024; // 5MB

//     if (!allowedMimes.includes(frontFile.mimetype)) {
//       return res.status(400).json({
//         success: false,
//         message: "Only JPG and PNG images are allowed"
//       });
//     }

//     if (frontFile.size > maxSize) {
//       return res.status(400).json({
//         success: false,
//         message: "Image size must be less than 5MB"
//       });
//     }

//     // 3️⃣ Get profile
//     const profile = await Profile.findOne({ userId });
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         message: "Profile not found"
//       });
//     }

//     // 4️⃣ Upload document
//     const uploadResult = await uploadStream(frontFile.buffer, {
//       folder: `mafs/users/${userId}/kyc`,
//       transformation: [
//         { width: 1200, height: 800, crop: "limit", quality: "auto:best" }
//       ]
//     });

//     // 5️⃣ Ensure verification object exists
//     if (!profile.verification) profile.verification = {};

//     // 6️⃣ Save doc URL (AS PER DB MODEL)
//     profile.verification.docUrl = uploadResult.secure_url;

//     // 7️⃣ Status logic (selfie + doc)
//     if (profile.verification.selfieUrl) {
//       profile.verification.status = "pending";
//     } else {
//       profile.verification.status = "not_started";
//     }
//     const user = await User.findById(userId).lean();
//        const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);
//       let subData = await UserSubscription.findOne({ userId });
//       if (!subData) {
//         // Naya user hai toh default create karo
//         subData = await UserSubscription.create({ userId});
//       }
//       // Reset counters if it's a new day
//       subData.resetIfNeeded()
//       // await redis.del(redisKey);
//     // const formatted = formatProfileResponse(profile, blockedContacts,blockedUser);

//     // 8️⃣ Save profile
//     await profile.save();

//     // 9️⃣ Clear cache if exists
//     if (typeof clearProfileCache === "function") {
//       await clearProfileCache(userId);
//     }

//     return res.json({
//       success: true,
//       message: "ID document uploaded successfully. Verification is under review.",
//       data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser,subData)
//       } 
//     });

//   } catch (err) {
//     console.error("Upload ID error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to upload ID document",
//       error: err.message
//     });
//   }
// };
// module.exports.getVerificationStatus = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const profile = await Profile.findOne({ userId })
//       .select("verification")
//       .lean();

//     if (!profile || !profile.verification) {
//       return res.json({
//         success: true,
//         data: {
//           status: "not_started",
//           selfieUploaded: false,
//           documentUploaded: false,
//           rejectionReason: null,
//           message: "Verification not started"
//         }
//       });
//     }

//     const { status, selfieUrl, docUrl, rejectionReason } =
//       profile.verification;

//     // Status based message (frontend-friendly)
//     let message = "Verification not started";

//     if (status === "pending") {
//       message = "Your verification is under review";
//     } else if (status === "approved") {
//       message = "Your profile has been verified";
//     } else if (status === "rejected") {
//       message = "Your verification was rejected";
//     }

//     return res.json({
//       success: true,
//       data: {
//         status,
//         selfieUploaded: Boolean(selfieUrl),
//         documentUploaded: Boolean(docUrl),
//         rejectionReason: status === "rejected" ? rejectionReason || "Verification failed" : null,
//         message
//       }
//     });

//   } catch (err) {
//     console.error("Get verification status error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch verification status"
//     });
//   }
// };
// module.exports.updateLocation = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { latitude, longitude, city, state, country,full_address } = req.body || {};
//     console.log("address,country,state,city",full_address,country,state,city)
//     console.log("METHOD:", req.method);
// console.log("HEADERS:", req.headers);
// console.log("BODY:", req.body);


//     if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
//   return res.status(400).json({
//     success: false,
//     message: "Valid latitude and longitude are required"
//   });
// }
//   const user = await User.findById(userId).lean();
  
//     let profile = await getOrCreateProfile(userId);

//     // Update location
//     profile.location = {
//       type: "Point",
//       coordinates: [Number(longitude), Number(latitude)],
//       city: city || "",
//       state: state || "",
//       country: country || "",
//       full_address : full_address || ""
//     };

//      const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);
   
//     await profile.save();

//     // Clear cache
//     await clearProfileCache(userId);

//     // Format response
//     // const response = formatResponse(profile);

//     return res.json({
//       success: true,
//       message: "Location updated successfully",
//        data: {
//         user: formatProfileResponse(user,profile, blockedContacts,blockedUser)
//       }
//     });

//   } catch (err) {
//     console.error("Update location error:", err);
//     return res.status(500).json({
//       success: false,
//       code: "UPDATE_FAILED",
//       message: err.message
//     });
//   }
// };
// module.exports.getStatus = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const cacheKey = `profile:status:${userId}`;

//     // Check cache
//     try {
//       const cached = await cache.get(cacheKey);
//       if (cached) {
//         return res.json({
//           success: true,
//           data: JSON.parse(cached),
//           cached: true
//         });
//       }
//     } catch (cacheErr) {
//       console.log("Cache read warning:", cacheErr.message);
//     }

//     // Get profile
//     const profile = await getOrCreateProfile(userId);

//     // Format response
//     // const response = formatResponse(profile);

//       const blockedContacts = await BlockedContact.find({ userId }).lean();
//     const formatted = formatProfileResponse(profile, blockedContacts);

//     // Cache for 30 seconds
//     try {
//       await cache.set(cacheKey, JSON.stringify(formatted), { EX: 30 });
//     } catch (cacheErr) {
//       console.log("Cache write warning:", cacheErr.message);
//     }

//     return res.json({
//       success: true,
//       data: formatted,
//       cached: false
//     });

//   } catch (err) {
//     console.error("Get status error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// const { formatPublicProfile } = require("./profile.userFormatter");
// const swipeModel = require("../matches/swipe/swipe.model");

// exports.getUserProfile = async (req, res) => {
//     try {
//         const { userId: targetUserId } = req.params; // Jiski profile dekhni hai
//         const viewer = req.user; // Jo user dekh raha hai (token se)

//         // 1. Database se target user ki poori profile nikalo
//         const targetProfile = await Profile.findOne({ userId: targetUserId }).lean();
        
//         if (!targetProfile) {
//             return res.status(404).json({ success: false, message: "User profile not found" });
//         }

//         // 2. Parallel Checks (Interaction History)
//         const [swipeAction, blockStatus] = await Promise.all([
//             swipeModel.findOne({ swiperId: viewer._id, targetId: targetUserId }).lean(),
//             Block.findOne({
//                 $or: [
//                     { blockerId: viewer._id, blockedId: targetUserId },
//                     { blockerId: targetUserId, blockedId: viewer._id }
//                 ]
//             }).lean()
//         ]);

//         // 3. Privacy Guard: Agar block hai toh profile nahi dikhegi
//         if (blockStatus) {
//             return res.status(403).json({ success: false, message: "Profile is private or unavailable" });
//         }

//         // 4. Universal Formatter Call
//         const formattedData = await formatPublicProfile(viewer, targetProfile, swipeAction);

//         res.json({
//             success: true,
//             data: formattedData
//         });

//     } catch (err) {
//         console.error("Fetch Profile Error:", err);
//         res.status(500).json({ success: false, message: "Failed to load profile details" });
//     }
// };
// exports.updateDiscoveryFilters = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { discoveryFilters } = req.body; 

//     let profile = await Profile.findOne({ userId });

//     if (discoveryFilters) {
//       // ✅ INTERESTS: Sneha ke interests yahan save honge
//       if (discoveryFilters.interests) {
//           profile.discovery.preferredInterests = discoveryFilters.interests;
//       }
      
//       if (discoveryFilters.relationshipGoal) {
//           profile.discovery.filterRelationshipGoal = discoveryFilters.relationshipGoal;
//       }
      
//       // ✅ AGE RANGE: Sneha (25) ko target karne ke liye
//       if (discoveryFilters.ageRange) {
//           profile.discovery.ageRange = discoveryFilters.ageRange;
//       }
//       if (discoveryFilters.advanced) {
//     profile.discovery.advancedFilters = {
//         ...profile.discovery.advancedFilters,
//         ...discoveryFilters.advanced
//     };
// }
//     }

//     await profile.save();

//     // 🔥 SABSE ZAROORI: Redis key delete karo taaki Nayi Feed DB se aaye
//     if (redis) {
//         const CACHE_KEY = `feed:${userId.toString()}`;
//         await redis.del(CACHE_KEY);
//         console.log("Redis cache cleared for new filters");
//     }

//     return res.json({ success: true, message: "Filters applied! Feed is refreshing." });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
// exports.getDiscoveryPreference = async (req, res) => {
//   try {
//     const profile = await Profile.findOne({ userId: req.user._id })
//       .select('preferences discoveryFilters')
//       .lean();
//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         message: "Profile not found"
//       });
//     }
//     return res.json({
//       success: true,
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
// exports.updateVisibility = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { globalVisibility } = req.body;

//     // 1️⃣ Validation
//     const allowed = ["everyone", "matches_only", "nobody"];
//     if (!allowed.includes(globalVisibility)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid globalVisibility value"
//       });
//     }

//     // 2️⃣ Decide system flags
//     let isDiscoverable = true;
//     let canAccessSwipe = true;

//     if (globalVisibility === "nobody") {
//       isDiscoverable = false;
//       canAccessSwipe = false;
//     }

//     // 3️⃣ Update profile
//     const profile = await Profile.findOneAndUpdate(
//       { userId },
//       {
//         $set: {
//           "discovery.globalVisibility": globalVisibility,
//           isDiscoverable,
//           canAccessSwipe,
//           lastProfileUpdate: new Date()
//         }
//       },
//       { new: true }
//     ).select("discovery.globalVisibility isDiscoverable canAccessSwipe");

//     if (!profile) {
//       return res.status(404).json({
//         success: false,
//         message: "Profile not found"
//       });
//     }

//     if(redis){
//       await redis.del(`feed:${userId.toString()}`);
//     }
    
//     // // 4️⃣ Feed cache clear (VERY IMPORTANT 🔥)
//     // await redis?.del(`feed:${userId}`);

//     return res.json({
//       success: true,
//       message: "Visibility updated successfully",
//       data: {
//         globalVisibility: profile.discovery.globalVisibility,
//         isDiscoverable: profile.isDiscoverable,
//         canAccessSwipe: profile.canAccessSwipe
//       }
//     });

//   } catch (err) {
//     console.error("Update visibility error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };




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
const { formatPublicProfile } = require("./profile.userFormatter");
const swipeModel = require("../matches/swipe/swipe.model");

// --- REUSABLE OPTIMIZED HELPERS ---

// Sabse heavy part yehi tha, isko parallel kar diya hai
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

// --- CONTROLLERS ---

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

exports.getUserProfile = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const viewer = req.user;

    const [targetProfile, swipeAction, blockStatus] = await Promise.all([
      Profile.findOne({ userId: targetUserId }).lean(),
      swipeModel.findOne({ swiperId: viewer._id, targetId: targetUserId }).lean(),
      Block.findOne({ $or: [{ blockerId: viewer._id, blockedId: targetUserId }, { blockerId: targetUserId, blockedId: viewer._id }] }).lean()
    ]);

    if (!targetProfile) return res.status(404).json({ success: false, message: "User profile not found" });
    if (blockStatus) return res.status(403).json({ success: false, message: "Profile is private or unavailable" });

    const formattedData = await formatPublicProfile(viewer, targetProfile, swipeAction);
    res.json({ success: true, data: formattedData });
  } catch (err) {
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

    return res.json({ success: true, message: "Filters applied! Feed is refreshing." });
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
//       return res.status(401).json({ success: false, message: "User not authenticated" });
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