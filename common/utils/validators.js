// // // // validators/discoveryFilters.validator.js

// // // const VALID_ADVANCED_FILTER_KEYS = [
// // //   "zodiac", "education", "familyPlans", "personalityType",
// // //   "communicationStyle", "loveStyle", "pets", "drinking",
// // //   "smoking", "workout", "dietary", "socialMedia", "sleeping"
// // // ];

// // // const VALID_TOP_LEVEL_KEYS = [
// // //   "interests", "relationshipGoal", "ageRange", "advanced", "showMeGender"
// // // ];

// // // const VALID_GENDERS = ["male", "female", "non-binary", "other"];

// // // /**
// // //  * Checks if a string array has empty/whitespace-only strings
// // //  * [] → VALID (means "clear this filter")
// // //  * ["value1"] → VALID
// // //  * [""] → INVALID
// // //  * ["value1", ""] → INVALID
// // //  * ["  "] → INVALID (whitespace only)
// // //  */
// // // const hasEmptyStrings = (arr) => {
// // //   return arr.some(item => typeof item !== "string" || item.trim() === "");
// // // };

// // // const validateDiscoveryFilters = (req, res, next) => {
// // //   const { discoveryFilters } = req.body;
// // //   const errors = [];

// // //   // ─── 1. discoveryFilters itself must exist and be an object ───
// // //   if (!discoveryFilters || typeof discoveryFilters !== "object" || Array.isArray(discoveryFilters)) {
// // //     return res.status(400).json({
// // //       success: false,
// // //       message: "discoveryFilters must be a valid object.",
// // //       errors: ["discoveryFilters is missing or not an object."]
// // //     });
// // //   }

// // //   // ─── 2. Check for unknown top-level keys ───
// // //   const unknownTopKeys = Object.keys(discoveryFilters).filter(
// // //     key => !VALID_TOP_LEVEL_KEYS.includes(key)
// // //   );
// // //   if (unknownTopKeys.length > 0) {
// // //     errors.push(`Unknown filter keys: ${unknownTopKeys.join(", ")}. Allowed: ${VALID_TOP_LEVEL_KEYS.join(", ")}`);
// // //   }

// // //   // ─── 3. interests validation ───
// // //   if (discoveryFilters.interests !== undefined) {
// // //     if (!Array.isArray(discoveryFilters.interests)) {
// // //       errors.push("interests must be an array of strings.");
// // //     } else if (discoveryFilters.interests.length > 0 && hasEmptyStrings(discoveryFilters.interests)) {
// // //       errors.push("interests array contains empty or invalid values. Send [] to clear, or valid strings only.");
// // //     }
// // //   }

// // //   // ─── 4. showMeGender validation ───
// // //   if (discoveryFilters.showMeGender !== undefined) {
// // //     if (!Array.isArray(discoveryFilters.showMeGender)) {
// // //       errors.push("showMeGender must be an array of strings.");
// // //     } else if (discoveryFilters.showMeGender.length > 0) {
// // //       if (hasEmptyStrings(discoveryFilters.showMeGender)) {
// // //         errors.push("showMeGender array contains empty or invalid values. Send [] to clear, or valid strings only.");
// // //       } else {
// // //         const invalidGenders = discoveryFilters.showMeGender.filter(
// // //           g => !VALID_GENDERS.includes(g.toLowerCase())
// // //         );
// // //         if (invalidGenders.length > 0) {
// // //           errors.push(`Invalid showMeGender values: ${invalidGenders.join(", ")}. Allowed: ${VALID_GENDERS.join(", ")}`);
// // //         }
// // //       }
// // //     }
// // //   }

// // //   // ─── 5. relationshipGoal validation ───
// // //   if (discoveryFilters.relationshipGoal !== undefined) {
// // //     if (
// // //       discoveryFilters.relationshipGoal !== null &&
// // //       (typeof discoveryFilters.relationshipGoal !== "string" ||
// // //         discoveryFilters.relationshipGoal.trim() === "")
// // //     ) {
// // //       errors.push("relationshipGoal must be a non-empty string or null to clear.");
// // //     }
// // //   }

// // //   // ─── 6. ageRange validation ───
// // //   if (discoveryFilters.ageRange !== undefined) {
// // //     const { ageRange } = discoveryFilters;

// // //     if (typeof ageRange !== "object" || Array.isArray(ageRange) || ageRange === null) {
// // //       errors.push("ageRange must be an object with min and max.");
// // //     } else {
// // //       const allowedAgeKeys = ["min", "max"];
// // //       const unknownAgeKeys = Object.keys(ageRange).filter(k => !allowedAgeKeys.includes(k));
// // //       if (unknownAgeKeys.length > 0) {
// // //         errors.push(`Unknown keys in ageRange: ${unknownAgeKeys.join(", ")}. Allowed: min, max`);
// // //       }

// // //       if (ageRange.min !== undefined) {
// // //         if (typeof ageRange.min !== "number" || !Number.isInteger(ageRange.min)) {
// // //           errors.push("ageRange.min must be an integer.");
// // //         } else if (ageRange.min < 18) {
// // //           errors.push("ageRange.min cannot be less than 18.");
// // //         } else if (ageRange.min > 100) {
// // //           errors.push("ageRange.min cannot be greater than 100.");
// // //         }
// // //       }

// // //       if (ageRange.max !== undefined) {
// // //         if (typeof ageRange.max !== "number" || !Number.isInteger(ageRange.max)) {
// // //           errors.push("ageRange.max must be an integer.");
// // //         } else if (ageRange.max < 18) {
// // //           errors.push("ageRange.max cannot be less than 18.");
// // //         } else if (ageRange.max > 100) {
// // //           errors.push("ageRange.max cannot be greater than 100.");
// // //         }
// // //       }

// // //       // Cross-field check
// // //       if (
// // //         typeof ageRange.min === "number" &&
// // //         typeof ageRange.max === "number" &&
// // //         Number.isInteger(ageRange.min) &&
// // //         Number.isInteger(ageRange.max)
// // //       ) {
// // //         if (ageRange.min > ageRange.max) {
// // //           errors.push("ageRange.min cannot be greater than ageRange.max.");
// // //         }
// // //         if (ageRange.max - ageRange.min < 3) {
// // //           errors.push("ageRange difference must be at least 3 years.");
// // //         }
// // //       }
// // //     }
// // //   }

// // //   // ─── 7. advanced filters validation ───
// // //   if (discoveryFilters.advanced !== undefined) {
// // //     const { advanced } = discoveryFilters;

// // //     if (typeof advanced !== "object" || Array.isArray(advanced) || advanced === null) {
// // //       errors.push("advanced must be a valid object.");
// // //     } else {
// // //       // Check unknown keys inside advanced
// // //       const unknownAdvancedKeys = Object.keys(advanced).filter(
// // //         key => !VALID_ADVANCED_FILTER_KEYS.includes(key)
// // //       );
// // //       if (unknownAdvancedKeys.length > 0) {
// // //         errors.push(
// // //           `Unknown keys in advanced filters: ${unknownAdvancedKeys.join(", ")}. Allowed: ${VALID_ADVANCED_FILTER_KEYS.join(", ")}`
// // //         );
// // //       }

// // //       // Validate each advanced filter field
// // //       for (const key of VALID_ADVANCED_FILTER_KEYS) {
// // //         if (advanced[key] !== undefined) {
// // //           if (!Array.isArray(advanced[key])) {
// // //             errors.push(`advanced.${key} must be an array.`);
// // //           } else if (advanced[key].length > 0 && hasEmptyStrings(advanced[key])) {
// // //             errors.push(
// // //               `advanced.${key} contains empty or invalid values. Send [] to clear, or valid strings only.`
// // //             );
// // //           }
// // //         }
// // //       }
// // //     }
// // //   }

// // //   // ─── 8. Return all errors at once ───
// // //   if (errors.length > 0) {
// // //     return res.status(400).json({
// // //       success: false,
// // //       message: errors[0], // Primary message for quick display
// // //       errors: errors       // Full list for debugging / frontend
// // //     });
// // //   }

// // //   next();
// // // };

// // // module.exports = { validateDiscoveryFilters };



// // // validators/discoveryFilters.validator.js

// // const VALID_ADVANCED_FILTER_KEYS = [
// //   "zodiac", "education", "familyPlans", "personalityType",
// //   "communicationStyle", "loveStyle", "pets", "drinking",
// //   "smoking", "workout", "dietary", "socialMedia", "sleeping"
// // ];

// // // const VALID_TOP_LEVEL_KEYS = [
// // //   "interests", "relationshipGoal", "ageRange", "advanced", "showMeGender"
// // // ];

// // // const VALID_GENDERS = ["men", "women", "Non-binary", "Trans Man","Trans Women","Genderqueer" ,"other"];

// // const hasEmptyStrings = (arr) => {
// //   return arr.some(item => typeof item !== "string" || item.trim() === "");
// // };

// // const sendError = (res, message) => {
// //   return res.status(400).json({ success: false, message });
// // };

// // const validateDiscoveryFilters = (req, res, next) => {
// //   const { discoveryFilters } = req.body;

// //   // ─── 1. discoveryFilters must exist ───
// //   if (!discoveryFilters || typeof discoveryFilters !== "object" || Array.isArray(discoveryFilters)) {
// //     return sendError(res, "discoveryFilters must be a valid object.");
// //   }

// // //   // ─── 2. Unknown top-level keys ───
// // //   const unknownTopKeys = Object.keys(discoveryFilters).filter(
// // //     key => !VALID_TOP_LEVEL_KEYS.includes(key)
// // //   );
// // //   if (unknownTopKeys.length > 0) {
// // //     return sendError(res, `Unknown filter key: ${unknownTopKeys[0]}`);
// // //   }

// //   // ─── 3. interests ───
// //   if (discoveryFilters.interests !== undefined) {
// //     if (!Array.isArray(discoveryFilters.interests)) {
// //       return sendError(res, "interests must be an array.");
// //     }
// //     if (discoveryFilters.interests.length > 0 && hasEmptyStrings(discoveryFilters.interests)) {
// //       return sendError(res, "interests contains empty or invalid values.");
// //     }
// //   }

// // //   // ─── 4. showMeGender ───
// // //   if (discoveryFilters.showMeGender !== undefined) {
// // //     if (!Array.isArray(discoveryFilters.showMeGender)) {
// // //       return sendError(res, "showMeGender must be an array.");
// // //     }
// // //     if (discoveryFilters.showMeGender.length > 0) {
// // //       if (hasEmptyStrings(discoveryFilters.showMeGender)) {
// // //         return sendError(res, "showMeGender contains empty or invalid values.");
// // //       }
// // //     //   const invalidGenders = discoveryFilters.showMeGender.filter(
// // //     //     g => !VALID_GENDERS.includes(g.toLowerCase())
// // //     //   );
// // //     //   if (invalidGenders.length > 0) {
// // //     //     return sendError(res, `Invalid showMeGender value: ${invalidGenders[0]}`);
// // //     //   }
// // //     }
// // //   }

// //   // ─── 5. relationshipGoal ───
// // //   if (discoveryFilters.relationshipGoal !== undefined) {
// // //     if (
// // //       discoveryFilters.relationshipGoal !== null &&
// // //       (typeof discoveryFilters.relationshipGoal !== "string" ||
// // //         discoveryFilters.relationshipGoal.trim() === "")
// // //     ) {
// // //       return sendError(res, "relationshipGoal must be a valid string or null.");
// // //     }
// // //   }

// //   // ─── 6. ageRange ───
// //   if (discoveryFilters.ageRange !== undefined) {
// //     const { ageRange } = discoveryFilters;

// //     if (typeof ageRange !== "object" || Array.isArray(ageRange) || ageRange === null) {
// //       return sendError(res, "ageRange must be an object with min and max.");
// //     }

// //     const unknownAgeKeys = Object.keys(ageRange).filter(k => !["min", "max"].includes(k));
// //     if (unknownAgeKeys.length > 0) {
// //       return sendError(res, `Unknown key in ageRange: ${unknownAgeKeys[0]}`);
// //     }

// //     if (ageRange.min !== undefined) {
// //       if (typeof ageRange.min !== "number" || !Number.isInteger(ageRange.min)) {
// //         return sendError(res, "ageRange.min must be an integer.");
// //       }
// //       if (ageRange.min < 18) {
// //         return sendError(res, "ageRange.min cannot be less than 18.");
// //       }
// //       if (ageRange.min > 100) {
// //         return sendError(res, "ageRange.min cannot be greater than 100.");
// //       }
// //     }

// //     if (ageRange.max !== undefined) {
// //       if (typeof ageRange.max !== "number" || !Number.isInteger(ageRange.max)) {
// //         return sendError(res, "ageRange.max must be an integer.");
// //       }
// //       if (ageRange.max < 18) {
// //         return sendError(res, "ageRange.max cannot be less than 18.");
// //       }
// //       if (ageRange.max > 100) {
// //         return sendError(res, "ageRange.max cannot be greater than 100.");
// //       }
// //     }

// //     if (
// //       typeof ageRange.min === "number" &&
// //       typeof ageRange.max === "number" &&
// //       Number.isInteger(ageRange.min) &&
// //       Number.isInteger(ageRange.max)
// //     ) {
// //       if (ageRange.min > ageRange.max) {
// //         return sendError(res, "ageRange.min cannot be greater than ageRange.max.");
// //       }
// //       if (ageRange.max - ageRange.min < 3) {
// //         return sendError(res, "ageRange difference must be at least 3 years.");
// //       }
// //     }
// //   }

// //   // ─── 7. advanced ───
// //   if (discoveryFilters.advanced !== undefined) {
// //     const { advanced } = discoveryFilters;

// //     if (typeof advanced !== "object" || Array.isArray(advanced) || advanced === null) {
// //       return sendError(res, "advanced must be a valid object.");
// //     }

// //     const unknownAdvancedKeys = Object.keys(advanced).filter(
// //       key => !VALID_ADVANCED_FILTER_KEYS.includes(key)
// //     );
// //     if (unknownAdvancedKeys.length > 0) {
// //       return sendError(res, `Unknown key in advanced filters: ${unknownAdvancedKeys[0]}`);
// //     }

// //     for (const key of Object.keys(advanced)) {
// //       if (!Array.isArray(advanced[key])) {
// //         return sendError(res, `${key} must be an array.`);
// //       }
// //       if (advanced[key].length > 0 && hasEmptyStrings(advanced[key])) {
// //         return sendError(res, `${key} contains empty or invalid values.`);
// //       }
// //     }
// //   }

// //   next();
// // };

// // module.exports = { validateDiscoveryFilters };





// // validators/discoveryFilters.validator.js

// const VALID_ADVANCED_FILTER_KEYS = [
//   "zodiac", "education", "familyPlans", "personalityType",
//   "communicationStyle", "loveStyle", "pets", "drinking",
//   "smoking", "workout", "dietary", "socialMedia", "sleeping"
// ];

// // const VALID_TOP_LEVEL_KEYS = [
// //   "interests", "relationshipGoal", "ageRange", "advanced", "showMeGender"
// // ];

// const hasEmptyStrings = (arr) => {
//   return arr.some(item => typeof item !== "string" || item.trim() === "");
// };

// const sendError = (res, message) => {
//   return res.status(400).json({ success: false, message });
// };

// const validateDiscoveryFilters = (req, res, next) => {
//   const { discoveryFilters } = req.body;

//   // ─── 1. discoveryFilters must exist ───
//   if (!discoveryFilters || typeof discoveryFilters !== "object" || Array.isArray(discoveryFilters)) {
//     return sendError(res, "discoveryFilters must be a valid object.");
//   }

//   // ─── 2. Unknown top-level keys ───
// //   const unknownTopKeys = Object.keys(discoveryFilters).filter(
// //     key => !VALID_TOP_LEVEL_KEYS.includes(key)
// //   );
// //   if (unknownTopKeys.length > 0) {
// //     return sendError(res, `Unknown filter key: ${unknownTopKeys[0]}`);
// //   }

//   // ─── 3. Only advanced filters validation ───
//   if (discoveryFilters.advanced !== undefined) {
//     const { advanced } = discoveryFilters;

//     if (typeof advanced !== "object" || Array.isArray(advanced) || advanced === null) {
//       return sendError(res, "advanced must be a valid object.");
//     }

//     // Unknown keys check
//     const unknownKeys = Object.keys(advanced).filter(
//       key => !VALID_ADVANCED_FILTER_KEYS.includes(key)
//     );
//     if (unknownKeys.length > 0) {
//       return sendError(res, `Unknown key in advanced filters: ${unknownKeys[0]}`);
//     }

//     // Each field must be array of valid strings
//     for (const key of Object.keys(advanced)) {
//       if (!Array.isArray(advanced[key])) {
//         return sendError(res, `${key} must be an array.`);
//       }
//       if (advanced[key].length > 0 && hasEmptyStrings(advanced[key])) {
//         return sendError(res, `${key} contains empty or invalid values.`);
//       }
//     }
//   }

//   next();
// };

// module.exports = { validateDiscoveryFilters };




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

  // ─── 4. showMeGender must be string only ───
  if (discoveryFilters.showMeGender !== undefined) {
    if (typeof discoveryFilters.showMeGender !== "string") {
      return sendError(res, "showMeGender must be a string.");
    }
    if (discoveryFilters.showMeGender.trim() === "") {
      return sendError(res, "showMeGender cannot be empty.");
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

module.exports = { validateDiscoveryFilters };