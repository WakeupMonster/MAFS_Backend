

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

  // ❌ frontend ne kuch nahi bheja
  if (
    !onboarding ||
    typeof onboarding.nextstep !== "number" ||
    typeof onboarding.currentScreenSlug !== "string" ||
    typeof onboarding.isComplete !== "boolean"
  ) {
    // DB se existing onboarding return karo
    const profile = await Profile.findOne(
      { userId },
      { onboarding: 1, onboardingProgress: 1 }
    ).lean();

    return (
      profile?.onboarding || {
        nextstep: 1,
        currentScreenSlug: "email_verification",
        isComplete: false,
        // totalCompletion: profile?.onboardingProgress?.totalCompletion || 0
      }
    );
  }



  const existingProfile = await Profile.findOne(
    { userId },
    { onboarding: 1 }
  ).lean();

  if (existingProfile?.onboarding?.isComplete) {
    return existingProfile.onboarding;
  }



  // ✅ VALID onboarding aaya hai → SAVE to DB
  const updatedProfile = await Profile.findOneAndUpdate(
    { userId },
    {
      $set: {
        onboarding: {
          ...onboarding,
          updatedAt: new Date()
        }
      }
    },
    { upsert: true, new: true, lean: true }
  );

  return {
    ...updatedProfile.onboarding,
    // totalCompletion: updatedProfile.onboardingProgress?.totalCompletion || 0
  };
}

module.exports = { buildOnboardingResponse };
