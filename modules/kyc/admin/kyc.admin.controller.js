// const Profile = require('../../profile/profile.model');
// const { ApiError } = require('../../../common/errors/ApiError');

// /**
//  * Approve KYC for a user
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware
//  */
// const approveKyc = async (req, res, next) => {
//   try {
//     const { userId } = req.params;
//     // const { rejectionReason } = req.body;

//     // Find and update the profile
//     const updatedProfile = await Profile.findOneAndUpdate(
//       { userId },
//       {
//         $set: {
//           'kyc.status': 'approved',
//           'kyc.verifiedAt': new Date(),
//           'kyc.rejectionReason': null,
//           canAccessSwipe: true,
//           isDiscoverable: true
//         }
//       },
//       { new: true, runValidators: true }
//     );

//     if (!updatedProfile) {
//       throw new ApiError(httpStatus.NOT_FOUND, 'User profile not found');
//     }

//     return res.json({
//       success: true,
//       message: 'KYC approved successfully',
//       data: {
//         userId: updatedProfile.userId,
//         kycStatus: updatedProfile.kyc.status,
//         canAccessSwipe: updatedProfile.canAccessSwipe,
//         isDiscoverable: updatedProfile.isDiscoverable
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// };


// const rejectKyc = async (req, res, next) => {
//   try {
//     const { userId } = req.params;
//     const { rejectionReason } = req.body;

//     if (!rejectionReason || rejectionReason.trim().length < 10) {
//       throw new ApiError(
//         httpStatus.BAD_REQUEST,
//         'Rejection reason is required and must be at least 10 characters long'
//       );
//     }

//     // Find and update the profile
//     const updatedProfile = await Profile.findOneAndUpdate(
//       { userId },
//       {
//         $set: {
//           'kyc.status': 'rejected',
//           'kyc.rejectionReason': rejectionReason,
//           'kyc.verifiedAt': null,
//           canAccessSwipe: false,
//           isDiscoverable: false
//         }
//       },
//       { new: true, runValidators: true }
//     );

//     if (!updatedProfile) {
//       throw new ApiError(httpStatus.NOT_FOUND, 'User profile not found');
//     }

//     return res.json({
//       success: true,
//       message: 'KYC rejected successfully',
//       data: {
//         userId: updatedProfile.userId,
//         kycStatus: updatedProfile.kyc.status,
//         rejectionReason: updatedProfile.kyc.rejectionReason,
//         canAccessSwipe: updatedProfile.canAccessSwipe,
//         isDiscoverable: updatedProfile.isDiscoverable
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// };


// const getKycDetails = async (req, res, next) => {
//   try {
//     const { userId } = req.params;

//     const profile = await Profile.findOne(
//       { userId },
//       {
//         'kyc.selfie': 1,
//         'kyc.idDocument': 1,
//         'kyc.status': 1,
//         'kyc.verifiedAt': 1,
//         'kyc.rejectionReason': 1,
//         canAccessSwipe: 1,
//         isDiscoverable: 1,
//         userId: 1
//       }
//     );

//     if (!profile) {
//       throw new ApiError(httpStatus.NOT_FOUND, 'User profile not found');
//     }

//     return res.json({
//       success: true,
//       data: profile
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * List all pending KYC requests
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware
//  */
// const listPendingKyc = async (req, res, next) => {
//   try {
//     const { page = 1, limit = 20 } = req.query;
//     const skip = (page - 1) * limit;

//     const [profiles, total] = await Promise.all([
//       Profile.find(
//         { 'kyc.status': 'pending' },
//         {
//           'kyc.selfie': 1,
//           'kyc.idDocument': 1,
//           'kyc.status': 1,
//           'kyc.submittedAt': 1,
//           userId: 1,
//           name: 1,
//           email: 1,
//           phone: 1
//         }
//       )
//         .sort({ 'kyc.submittedAt': 1 }) // Oldest first
//         .skip(skip)
//         .limit(parseInt(limit)),
      
//       Profile.countDocuments({ 'kyc.status': 'pending' })
//     ]);

//     return res.json({
//       success: true,
//       data: {
//         profiles,
//         pagination: {
//           total,
//           page: parseInt(page),
//           limit: parseInt(limit),
//           pages: Math.ceil(total / limit)
//         }
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = {
//   approveKyc,
//   rejectKyc,
//   getKycDetails,
//   listPendingKyc
// };
