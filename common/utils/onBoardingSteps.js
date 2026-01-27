function buildOnboardingResponse(req) {
  const onboarding = req.body && req.body.onboarding;

  // frontend se valid object aaya ho
  if (
    onboarding &&
    typeof onboarding.nextstep === "number" &&
    typeof onboarding.currentScreenSlug === "string" &&
    typeof onboarding.isComplete === "boolean"
  ) {
    return onboarding;
  }

  // fallback default
  return {
    nextstep: 1,
    currentScreenSlug: "photos_screen",
    isComplete: false
  };
}

module.exports = {
  buildOnboardingResponse
};
