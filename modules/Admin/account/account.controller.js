const bcrypt = require("bcryptjs");
const Profile = require("../../profile/profile.model");
const User = require("../../auth/auth.model");
const { uploadStream } = require("../../upload/cloudinary.service");

/**
 * GET Admin Profile
 * Purpose: Retrieves current logged-in admin's data with structured response
 */
module.exports.getAdminAccount = async (req, res) => {
  try {
    const adminId = req.user.id;

    const adminData = await User.findById(adminId).select(
      "email phone isEmailVerified isPhoneVerified role lastLoginAt accountStatus authMethod createdAt"
    );

    if (!adminData || adminData.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied or Admin not found",
      });
    }

    const adminProfile = await Profile.findOne({ userId: adminId }).select(
      "nickname about photos location"
    );

    return res.status(200).json({
      success: true,
      data: {
        id: adminData._id,
        email: adminData.email,
        phone: adminData.phone,
        nickname: adminProfile.nickname,
        about: adminProfile.about,
        avatar: {
          id: adminProfile.photos?.[0]?._id || null,
          url: adminProfile.photos?.[0]?.url || null,
          publicId: adminProfile.photos?.[0]?.publicId || null,
        },
        status: adminData.accountStatus,
        role: adminData.role,
        verified: {
          email: adminData.isEmailVerified,
          phone: adminData.isPhoneVerified,
        },
        memberSince: adminData.createdAt,
        location: adminProfile.location,
        lastLoginAt: adminData.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("GET ADMIN ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * UPDATE Admin Profile
 * Purpose: Updates account details, profile settings, and profile picture
 */
module.exports.updateAdminAccount = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { email, phone, nickname, about, location } = req.body;

    // Check if avatar exists in req.files (assuming multer or similar middleware)
    // const avatarFile = req.files?.avatar?.[0] || req.files?.[0];
    const avatarFile =
      req.file || (req.files?.avatar ? req.files.avatar[0] : null);

    // 1. Handle Account Updates (User Collection)
    const accountUpdates = {};
    if (email) accountUpdates.email = email;
    if (phone) accountUpdates.phone = phone;

    const updatedAccount = await User.findByIdAndUpdate(
      adminId,
      { $set: accountUpdates },
      { new: true, runValidators: true }
    ).select(
      "email phone isEmailVerified isPhoneVerified role accountStatus authMethod createdAt"
    );

    // 2. Handle Profile Updates (Profile Collection)
    const profileUpdates = {
      lastProfileUpdate: Date.now(),
    };

    if (nickname) profileUpdates.nickname = nickname;
    if (about) profileUpdates.about = about;

    // Parse location if it comes as a string from form-data
    if (location) {
      profileUpdates.location =
        typeof location === "string" ? JSON.parse(location) : location;
    }

    // 3. Handle Avatar Upload to Cloudinary
    if (avatarFile) {
      const uploadedAvatar = await uploadStream(avatarFile.buffer, {
        folder: "mafs/admin/profiles",
        public_id: `admin_${adminId}_${Date.now()}`,
        resource_type: "image",
        overwrite: true,
      });

      // Update photos array (Setting this as the primary photo at index 0)
      profileUpdates.photos = [
        {
          id: uploadedAvatar.public_id,
          url: uploadedAvatar.secure_url,
          publicId: uploadedAvatar.public_id,
          order: 0,
          uploadedAt: new Date(),
        },
      ];
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: adminId },
      { $set: profileUpdates },
      { new: true, upsert: true }
    );

    // 4. Return Structured Response (Same as GET API)
    return res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      data: {
        id: updatedAccount._id,
        email: updatedAccount.email,
        phone: updatedAccount.phone,
        nickname: updatedProfile.nickname,
        about: updatedProfile.about,
        location: updatedProfile.location,
        avatar: {
          id: updatedProfile.photos?.[0]?._id || null,
          url: updatedProfile.photos?.[0]?.url || null,
          publicId: updatedProfile.photos?.[0]?.publicId || null,
        },
        status: updatedAccount.accountStatus,
        role: updatedAccount.role,
        verified: {
          email: updatedAccount.isEmailVerified,
          phone: updatedAccount.isPhoneVerified,
        },
        memberSince: updatedAccount.createdAt,
      },
    });
  } catch (error) {
    console.error("UPDATE ADMIN ERROR:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email or Phone already in use" });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to update admin profile" });
  }
};
