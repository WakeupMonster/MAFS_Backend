// utils/userHelper.js
const User = require("../../modules/auth/auth.model");
const Profile = require("../../modules/profile/profile.model");
const UserSubscription = require("../../modules/auth/UserSubscription.model");
const BlockedContact = require("../../modules/BlockedContact/blockedContacts.model");
const Block = require("../../modules/profile/user.block");
const { formatUserProfile } = require("../../modules/auth/auth.formatter"); // Path check kar lena

const getUpdatedUserResponse = async (userId) => {
    // 1. Saara data parallel fetch karein (Performance ke liye)
    const [user, profile, subData, blockedContacts, blockedUser] = await Promise.all([
        User.findById(userId).lean(),
        Profile.findOne({ userId }).lean(),
        UserSubscription.findOne({ userId }),
        BlockedContact.find({ userId }).lean(),
        Block.find({ blockerId: userId }).lean()
    ]);

    if (!user) return null;

    // 2. Subscription reset logic (Daily limits update karne ke liye)
    if (subData && typeof subData.resetIfNeeded === 'function') {
        subData.resetIfNeeded();
    }

    // 3. Format function ko call karein aur result return karein
    return formatUserProfile(user, profile, blockedContacts, blockedUser, subData);
};

module.exports = { getUpdatedUserResponse };