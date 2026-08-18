const User = require("../../modules/auth/auth.model");
const Profile = require("../../modules/profile/profile.model");
const BlockedContact = require("../../modules/BlockedContact/blockedContacts.model");
const BlockedUser = require("../../modules/profile/user.block");
const UserSubscription = require("../../modules/auth/UserSubscription.model");
const { formatProfileResponse } = require("../../modules/profile/profile.formatter");

module.exports = async function getFormattedUser(userId, req) {

  const [user, profile, blockedContacts, blockedUser, subData] = await Promise.all([
    User.findById(userId),
    Profile.findOne({ userId }),
    BlockedContact.find({ userId }).lean(),
    BlockedUser.find({ userId }).lean(),
    UserSubscription.findOne({ userId, isActive: true }).lean(),
  ]);

  if (!user) return null;

  return await formatProfileResponse(
    user,
    profile,
    blockedContacts,
    blockedUser,
    subData,
    req
  );
};