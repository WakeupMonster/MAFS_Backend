// function buildOnboardingResponse(req) {
//   const onboarding = req.body && req.body.onboarding;

//    if (typeof onboarding === "string") {
//     try {
//       onboarding = JSON.parse(onboarding);
//     // eslint-disable-next-line no-unused-vars
//     } catch (e) {
//       onboarding = null;
//     }
//   }

//   // frontend se valid object aaya ho
//   if (
//     onboarding &&
//     typeof onboarding.nextstep === "number" &&
//     typeof onboarding.currentScreenSlug === "string" &&
//     typeof onboarding.isComplete === "boolean"
//   ) {
//     return onboarding;
//   }

//   // fallback default
//   return {
//     nextstep: 1,
//     currentScreenSlug: "photos_screen",
//     isComplete: false
//   };
// }

// module.exports = {
//   buildOnboardingResponse
// };


function buildOnboardingResponse(req) {
  let onboarding = req.body && req.body.onboarding;

  if (typeof onboarding === "string") {
    try {
      onboarding = JSON.parse(onboarding);
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      onboarding = null;
    }
  }

  if (
    onboarding &&
    typeof onboarding.nextstep === "number" &&
    typeof onboarding.currentScreenSlug === "string" &&
    typeof onboarding.isComplete === "boolean"
  ) {
    return onboarding;
  }

  // fallback
  return {
    nextstep: 1,
    currentScreenSlug: "photos_screen",
    isComplete: false
  };
}

module.exports = { buildOnboardingResponse };
