const User = require("../../modules/auth/auth.model");
const Profile = require("../../modules/profile/profile.model");
const BlockedContact = require("../../modules/BlockedContact/blockedContacts.model");
const BlockedUser = require("../../modules/profile/user.block");
const UserSubscription = require("../../modules/auth/UserSubscription.model");
const { formatProfileResponse } = require("../../modules/profile/profile.formatter");

module.exports = async function getFormattedUser(userId, req) {

  const user = await User.findById(userId);

  if (!user) return null;

  const profile = await Profile.findOne({ userId });

  const blockedContacts = await BlockedContact.find({ userId }).lean();

  const blockedUser = await BlockedUser.find({ userId }).lean();

  const subData = await UserSubscription.findOne({
    userId,
    isActive: true
  }).lean();

  return await formatProfileResponse(
    user,
    profile,
    blockedContacts,
    blockedUser,
    subData,
    req
  );
};