

// validators/discoveryFilters.validator.js

const VALID_ADVANCED_FILTER_KEYS = [
  "zodiac", "education", "familyPlans", "personalityType",
  "communicationStyle", "loveStyle", "pets", "drinking",
  "smoking", "workout", "dietary", "socialMedia", "sleeping"
];

// const VALID_TOP_LEVEL_KEYS = [
//   "interests", "relationshipGoal", "ageRange", "advanced", "showMeGender"
// ];

const hasEmptyStrings = (arr) => {
  return arr.some(item => typeof item !== "string" || item.trim() === "");
};

const sendError = (res, message) => {
  return res.status(400).json({ success: false, message });
};

const validateDiscoveryFilters = (req, res, next) => {
  const { discoveryFilters } = req.body;

  // ─── 1. discoveryFilters must exist ───
  if (!discoveryFilters || typeof discoveryFilters !== "object" || Array.isArray(discoveryFilters)) {
    return sendError(res, "discoveryFilters must be a valid object.");
  }

  // ─── 2. Unknown top-level keys ───
  //   const unknownTopKeys = Object.keys(discoveryFilters).filter(
  //     key => !VALID_TOP_LEVEL_KEYS.includes(key)
  //   );
  //   if (unknownTopKeys.length > 0) {
  //     return sendError(res, `Unknown filter key: ${unknownTopKeys[0]}`);
  //   }

  // ─── 3. relationshipGoal must be string only ───
  if (discoveryFilters.relationshipGoal !== undefined) {
    if (typeof discoveryFilters.relationshipGoal !== "string") {
      return sendError(res, "relationshipGoal must be a string.");
    }
    if (discoveryFilters.relationshipGoal.trim() === "") {
      return sendError(res, "relationshipGoal cannot be empty.");
    }
  }

  // // ─── 4. showMeGender must be string only ───
  // if (discoveryFilters.showMeGender !== undefined) {
  //   if (typeof discoveryFilters.showMeGender !== "string") {
  //     return sendError(res, "showMeGender must be a string.");
  //   }
  //   if (discoveryFilters.showMeGender.trim() === "") {
  //     return sendError(res, "showMeGender cannot be empty.");
  //   }
  // }

  // ─── 4.5. globalVisibility validation ───
  if (discoveryFilters.globalVisibility !== undefined) {
    if (typeof discoveryFilters.globalVisibility !== "string") {
      return sendError(res, "globalVisibility must be a string.");
    }
    const validVisibility = ["everyone", "private"];
    if (!validVisibility.includes(discoveryFilters.globalVisibility)) {
      return sendError(res, "globalVisibility must be one of: everyone, private");
    }
  }

  // ─── 5. advanced filters validation ───
  if (discoveryFilters.advanced !== undefined) {
    const { advanced } = discoveryFilters;

    if (typeof advanced !== "object" || Array.isArray(advanced) || advanced === null) {
      return sendError(res, "advanced must be a valid object.");
    }

    const unknownKeys = Object.keys(advanced).filter(
      key => !VALID_ADVANCED_FILTER_KEYS.includes(key)
    );
    if (unknownKeys.length > 0) {
      return sendError(res, `Unknown key in advanced filters: ${unknownKeys[0]}`);
    }

    for (const key of Object.keys(advanced)) {
      if (!Array.isArray(advanced[key])) {
        return sendError(res, `${key} must be an array.`);
      }
      if (advanced[key].length > 0 && hasEmptyStrings(advanced[key])) {
        return sendError(res, `${key} contains empty or invalid values.`);
      }
    }
  }

  next();
};

module.exports = { validateDiscoveryFilters }