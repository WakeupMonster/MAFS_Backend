const canUserAccessFeed = ({ profile }) => {
  if (!profile) return false;

  // 1️⃣ Profile ready hona chahiye
  if (profile.isMandatoryComplete !== true) return false;

  // 2️⃣ KYC approved hona chahiye
  if (profile.verification?.status !== "approved") return false;

  // 3️⃣ User ne khud ko hide nahi kiya hona chahiye
  // if (profile.discovery?.globalVisibility === "nobody") return false;

  return true;
};

module.exports = { canUserAccessFeed };