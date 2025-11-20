const UserAuth = require("../auth/auth.model");
const Profile = require("./profile.model");

module.exports.updateBasicInfo = async (userId, data) => {
  const profile = await Profile.findOneAndUpdate(
    { userId },
    data,
    { new: true, upsert: true }
  );
  return profile;
};

module.exports.updateLocation = async (userId, data) => {
  const location = {
    type: "Point",
    coordinates: [data.longitude, data.latitude],
    city: data.city || "",
    country: data.country || ""
  };

  const profile = await Profile.findOneAndUpdate(
    { userId },
    { location },
    { new: true, upsert: true }
  );
  
  return profile;
};

module.exports.updateInterests = async (userId, data) => {
  return await Profile.findOneAndUpdate(
    { userId },
    { interests: data.interests },
    { new: true, upsert: true }
  );
};

module.exports.updatePreferences = async (userId, data) => {
  return await Profile.findOneAndUpdate(
    { userId },
    { preferences: data },
    { new: true, upsert: true }
  );
};

module.exports.uploadPhoto = async (userId, data) => {
  return await Profile.findOneAndUpdate(
    { userId },
    { $push: { photos: data } },
    { new: true, upsert: true }
  );
};

module.exports.markProfileCompleted = async (userId) => {
  await UserAuth.findByIdAndUpdate(userId, {
    isProfileCompleted: true
  });

  return { completed: true };
};
