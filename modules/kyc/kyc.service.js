// // src/modules/kyc/kyc.service.js

// const Kyc = require("./kyc.model");
// const profileModel = require("../profile/profile.model");
// const { uploadStream } = require("../upload/cloudinary.service");

// const uploadToCloudinary = async (buffer, folder = 'kyc') => {
//   try {
//     const result = await uploadStream(buffer, { 
//       folder: `dating-app/${folder}`,
//       resource_type: 'auto'
//     });
//     return result.secure_url;
//   } catch (error) {
//     console.error('Error uploading to Cloudinary:', error);
//     throw new Error('Failed to upload file');
//   }
// };

// module.exports.createOrUpdateKyc = async (userId, { selfieBuffer, idVerificationBuffer }) => {
//   const profile = await profileModel.findOne({ userId });
//   if (!profile) throw new Error("Profile not found");

//   // Upload both files in parallel
//   const [selfieUrl, idVerificationUrl] = await Promise.all([
//     uploadToCloudinary(selfieBuffer, 'kyc/selfie'),
//     uploadToCloudinary(idVerificationBuffer, 'kyc/id')
//   ]);

//   // Create or update KYC
//   const kyc = await Kyc.findOneAndUpdate(
//     { userId },
//     { 
//       selfieUrl,
//       IDVerificationUrl: idVerificationUrl,
//       verificationStatus: 'pending',
//       verifiedAt: null
//     },
//     { new: true, upsert: true }
//   );

//   // Update profile with KYC status
//   profile.isKycVerified = false; // Set to false until admin verifies
//   profile.onboardingProgress.kycSubmitted = true;
//   await profile.save();

//   return kyc;
// };

// module.exports.getKyc = async (userId) => {
//   const kyc = await Kyc.findOne({ userId });
//   if (!kyc) throw new Error("No KYC found");
//   return kyc;
// };

// module.exports.updateVerificationStatus = async (userId, { status, rejectionReason = '' }) => {
//   const update = { 
//     verificationStatus: status,
//     ...(status === 'approved' && { verifiedAt: new Date() }),
//     ...(status === 'rejected' && { rejectionReason })
//   };

//   const kyc = await Kyc.findOneAndUpdate(
//     { userId },
//     update,
//     { new: true }
//   );

//   if (!kyc) throw new Error("No KYC found");

//   // Update profile verification status if approved
//   if (status === 'approved') {
//     await profileModel.findOneAndUpdate(
//       { userId },
//       { 
//         isKycVerified: true,
//         'onboardingProgress.kycVerified': true 
//       }
//     );
//   }

//   return kyc;
// };



const Kyc = require('./kyc.model');
// const { uploadStream } = require('../upload/cloudinary.service');

// const uploadToCloudinary = async (buffer, folder = 'kyc') => {
//   const result = await uploadStream(buffer, { 
//     folder: `dating-app/${folder}`,
//     resource_type: 'auto'
//   });
//   return result.secure_url;
// };

module.exports.createOrUpdateKyc = async (userId, { selfieUrl, idVerificationUrl }) => {
  return Kyc.findOneAndUpdate(
    { userId },
    { 
      selfieUrl,
      IDVerificationUrl: idVerificationUrl
    },
    { new: true, upsert: true }
  );
};

module.exports.getKyc = async (userId) => {
  return Kyc.findOne({ userId });
};