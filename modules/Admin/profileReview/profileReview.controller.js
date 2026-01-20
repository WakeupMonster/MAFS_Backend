const  Profile  = require("../../../modules/profile/profile.model");
const  User  = require("../../../modules/auth/auth.model");
const { formatProfileResponse } = require("../../../modules/profile/profile.formatter");
const Report  = require("../../../modules/profile/user.report");

const getProfileForReview = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user and profile with all necessary data
    const [user, profile, reports] = await Promise.all([
      User.findById(userId).lean(),
      Profile.findOne({ userId }).lean(),
      Report.find({ reportedId: userId, status: 'new' })
        // .populate('reportedBy', 'name email phone')
        .lean()
    ]);
console.log(reports)
    if (!user || !profile) {
      return res.status(404).json({
        success: false,
        message: 'User or profile not found'
      });
    }


    const response = {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      accountStatus: user.accountStatus,
      isVerified: user.isVerified,
      isBanned: user.banDetails?.isBanned || false,
      banReason: user.banDetails?.reason || null,
      banDetails: user.banDetails || {},
      
      profile: {
        nickname: profile.nickname,
        photos: profile?.photos || [],
        bio: profile.about,
        interests: profile.interests || [],
        gender: profile.gender,
        age: profile.age,
        dob: profile.dob,
        location: profile?.location || {},
        verification: profile?.verification || {},
        createdAt: profile.createdAt,
        lastActive: user.lastActive || null,
        deviceInfo: user.deviceInfo || {}
      },
      
      reports: reports.map(report => ({
        _id: report._id,
        reason: report.reason,
        details: report.details,
        reportedBy: report.reportedBy,
        createdAt: report.createdAt
      })),
      
      reportCount: reports.length
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching profile for review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile for review',
      error: error.message
    });
  }
};

const updateProfileStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason, banDuration } = req.body;
    const adminId = req.user?._id; 

    if (!['approve', 'reject', 'ban'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be one of: approve, reject, ban'
      });
    }

    if ((action === 'reject' || action === 'ban') && !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for this action'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // let update = {};
    let message = '';

    switch (action) {
      case 'approve':
        // Mark all reports as reviewed
        await Report.updateMany(
          { reportedId: userId, status: 'new' },
          { 
            $set: { 
              status: 'resolved',
              resolvedAt: new Date(),
              resolvedBy: adminId,
              resolution: 'Profile approved after review'
            }
          }
        );
        message = 'Profile approved successfully';
        break;

      case 'reject':
        // Mark all reports as reviewed
        await Report.updateMany(
          { reportedId: userId, status: 'new' },
          { 
            $set: { 
              status: 'resolved',
              resolvedAt: new Date(),
              resolvedBy: adminId,
              resolution: 'Profile rejected: ' + reason
            }
          }
        );
        message = 'Profile rejected successfully';
        break;

      case 'ban':
        { const banDetails = {
          isBanned: true,
          reason,
          bannedBy: adminId,
          bannedAt: new Date(),
          banExpiresAt: banDuration ? 
            new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000) : 
            null // Permanent ban if no duration
        };
        
        await User.findByIdAndUpdate(userId, { 
          $set: { 
            'banDetails': banDetails,
            'accountStatus': 'banned'
          } 
        });

        // Mark all reports as reviewed
        await Report.updateMany(
          { reportedId: userId, status: 'new' },
          { 
            $set: { 
              status: 'resolved',
              resolvedAt: new Date(),
              resolvedBy: adminId,
              resolution: 'User banned: ' + reason
            }
          }
        );
        
        message = 'User banned successfully';
        break; }
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error updating profile status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile status',
      error: error.message
    });
  }
};
const getReportedProfiles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // First, get the base query without pagination to get total count
    const countQuery = {
      status: { $in: ["new", "in_progress"] }, // Changed to match your status values
      reportedId: { $exists: true, $ne: null }
    };

    const total = await Report.countDocuments(countQuery);
console.log("total",total)
    // Get reported profiles with pagination
    const reports = await Report.aggregate([
      {
        $match: {
          status: { $in: ["new", "in_progress"] },
          reportedId: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedId', // Changed from reportedUser to reportedId
          foreignField: '_id',
          as: 'reportedUser'
        }
      },
      { $unwind: '$reportedUser' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'reportedUser._id',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$reportedUser._id',
          user: { $first: '$reportedUser' },
          profile: { $first: '$profile' },
          reportCount: { $sum: 1 },
          reasons: { $addToSet: '$reason' },
          latestReport: { $max: '$createdAt' },
          reports: {
            $push: {
              _id: '$_id',
              reason: '$reason',
              description: '$description',
              status: '$status',
              severity: '$severity',
              reportedById: '$reporterId', // Changed from reportedBy to reporterId
              reportedAt: '$createdAt'
            }
          }
        }
      },
      { $sort: { latestReport: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Format the response
    const result = await Promise.all(reports.map(async (item) => {
      // If profile doesn't exist, create a minimal profile from user data
      if (!item.profile) {
        item.profile = {
          nickname: item.user.name || 'No Profile',
          photos: [],
          about: 'No profile information available',
          interests: [],
          gender: item.user.gender || 'Not specified',
          age: item.user.age || null,
          location: {},
          verification: {}
        };
      }

      const formattedProfile = formatProfileResponse(item.user, item.profile);
      
      return {
        userId: item.user._id,
        nickname: item.profile.nickname || item.user.name || 'No Nickname',
        profilePhoto: item.profile.photos?.[0]?.url || null,
        reportCount: item.reportCount,
        lastReportedAt: item.latestReport,
        status: item.reports[0]?.status || 'new', // Get status from the most recent report
        severity: item.reports[0]?.severity || 'medium', // Get severity from the most recent report
        reasons: item.reasons,
        profile: {
          photos: formattedProfile?.profile?.photos || [],
          bio: formattedProfile?.profile?.about || '',
          interests: formattedProfile?.profile?.interests || [],
          gender: formattedProfile?.profile?.gender || '',
          age: formattedProfile?.profile?.age || null,
          location: formattedProfile?.profile?.location || {},
          verification: formattedProfile?.profile?.verification || {}
        },
        reports: item.reports
      };
    }));

    res.json({
      success: true,
      data: result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getReportedProfiles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reported profiles',
      error: error.message
    });
  }
};
module.exports = {
  getReportedProfiles,
  getProfileForReview,
  updateProfileStatus
}