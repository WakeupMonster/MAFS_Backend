

// function buildOnboardingResponse(req={}) {
//   let onboarding = req.body && req.body.onboarding;

//   if (typeof onboarding === "string") {
//     try {
//       onboarding = JSON.parse(onboarding);
//     // eslint-disable-next-line no-unused-vars
//     } catch (err) {
//       onboarding = null;
//     }
//   }

//   if (
//     onboarding &&
//     typeof onboarding.nextstep === "number" &&
//     typeof onboarding.currentScreenSlug === "string" &&
//     typeof onboarding.isComplete === "boolean"
//   ) {
//     return onboarding;
//   }

//   // fallback
//   return {
//     nextstep: 1,
//     currentScreenSlug: "photos_screen",
//     isComplete: false
//   };
// }

// module.exports = { buildOnboardingResponse };




const Profile = require("../../modules/profile/profile.model");

async function buildOnboardingResponse(req = {}, userId) {
  let onboarding = req.body?.onboarding;

  // string safety
  if (typeof onboarding === "string") {
    try {
      onboarding = JSON.parse(onboarding);
    } catch {
      onboarding = null;
    }
  }

  let existingProfile = await Profile.findOne(
    { userId },
    { onboarding: 1, onboardingProgress: 1, verification: 1 }
  ).lean();

  // FORCE COMPLETE LOGIC: If step >= 11 and both URLs are present, it is ALWAYS complete.
  let isForcedComplete = false;
  if (
    existingProfile &&
    existingProfile.onboarding?.nextstep >= 11 &&
    existingProfile.verification?.selfieUrl &&
    existingProfile.verification?.docUrl
  ) {
    isForcedComplete = true;
    if (!existingProfile.onboarding.isComplete) {
      await Profile.updateOne({ userId }, { $set: { "onboarding.isComplete": true } });
      existingProfile.onboarding.isComplete = true;
    }
    if (onboarding) onboarding.isComplete = true;
  }

  // ❌ frontend ne kuch nahi bheja
  if (
    !onboarding ||
    typeof onboarding.nextstep !== "number" ||
    typeof onboarding.currentScreenSlug !== "string" ||
    typeof onboarding.isComplete !== "boolean"
  ) {
    return (
      existingProfile?.onboarding || {
        nextstep: 1,
        currentScreenSlug: "email_verification",
        isComplete: false,
      }
    );
  }

  if (existingProfile?.onboarding?.isComplete && !isForcedComplete) {
    // Already complete, keep it complete
    return existingProfile.onboarding;
  }

  // ✅ VALID onboarding aaya hai → SAVE to DB
  const updatedProfile = await Profile.findOneAndUpdate(
    { userId },
    {
      $set: {
        onboarding: {
          ...onboarding,
          isComplete: isForcedComplete ? true : onboarding.isComplete,
          updatedAt: new Date()
        }
      }
    },
    { upsert: true, new: true, lean: true }
  );

  return {
    ...updatedProfile.onboarding,
  };
}

module.exports = { buildOnboardingResponse };
