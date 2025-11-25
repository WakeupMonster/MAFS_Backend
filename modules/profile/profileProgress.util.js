// profileProgress.util.js
const Profile = require("./profile.model");

// weights for percent (sum to 100)
const STEP_WEIGHTS = {
  basicInfo: 20,
  location: 15,
  interestsSelected: 15,
  preferencesSet: 15,
  photosUploaded: 20,
  kycVerified: 15
};

function computeCompletion(progress) {
  let pct = 0;
  for (const k of Object.keys(STEP_WEIGHTS)) {
    if (progress[k]) pct += STEP_WEIGHTS[k];
  }
  return Math.min(100, pct);
}

// Update onboardingProgress fields on profile document and return updated doc
async function updateProfileProgress(userId, partialProgress = {}) {
  // Use findOneAndUpdate with $set to avoid extra roundtrips
  const setObj = {};
  for (const k of Object.keys(partialProgress)) {
    setObj[`onboardingProgress.${k}`] = partialProgress[k];
  }

  // We will compute completion after doing this update (atomic-ish read+write)
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $set: setObj },
    { new: true, upsert: true, lean: true }
  );

  const progress = profile.onboardingProgress || {};
  const completion = computeCompletion(progress);

  // store completion
  await Profile.updateOne({ userId }, { $set: { "onboardingProgress.completion": completion } });

  // fetch final doc (lean)
  const refreshed = await Profile.findOne({ userId }).lean();
  return refreshed.onboardingProgress;
}

module.exports = {
  computeCompletion,
  updateProfileProgress
};