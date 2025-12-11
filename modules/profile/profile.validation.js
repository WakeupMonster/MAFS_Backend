// // const Joi = require("joi");

// // // BASIC INFO
// // exports.basic = (req, res, next) => {
// //   const schema = Joi.object({
// //     nickname: Joi.string().max(50).optional(),
// //     fullName: Joi.string().max(100).optional(),
// //     bio: Joi.string().max(300).optional(),
// //     dob: Joi.date().iso().optional(),
// //     gender: Joi.string().valid("male", "female", "other").optional(),
// //   });

// //   validate(schema, req, res, next);
// // };

// // // LOCATION
// // exports.location = (req, res, next) => {
// //   const schema = Joi.object({
// //     lat: Joi.number().required(),
// //     lon: Joi.number().required(),
// //     city: Joi.string().optional(),
// //     country: Joi.string().optional()
// //   });

// //   validate(schema, req, res, next);
// // };

// // // INTERESTS
// // exports.interests = (req, res, next) => {
// //   const schema = Joi.object({
// //     interests: Joi.array().items(Joi.string()).min(1).required()
// //   });

// //   validate(schema, req, res, next);
// // };

// // // PREFERENCES
// // exports.preferences = (req, res, next) => {
// //   const schema = Joi.object({
// //     ageRange: Joi.object({
// //       min: Joi.number().min(18).required(),
// //       max: Joi.number().max(100).required()
// //     }).optional(),

// //     distanceRange: Joi.number().min(1).max(500).optional(),

// //     genderPreference: Joi.array()
// //       .items(Joi.string().valid("male", "female", "other"))
// //       .optional()
// //   });

// //   validate(schema, req, res, next);
// // };

// // // PHOTOS
// // exports.photoUpload = (req, res, next) => {
// //   const schema = Joi.object({
// //     url: Joi.string().uri().required(),
// //     isPrimary: Joi.boolean().optional(),
// //     order: Joi.number().optional()
// //   });

// //   validate(schema, req, res, next);
// // };

// // // COMMON VALIDATOR
// // function validate(schema, req, res, next) {
// //   const { error } = schema.validate(req.body);
// //   if (error) return res.status(400).json({ message: error.details[0].message });
// //   next();
// // }

// // // Add this after the interests validation in profile.validation.js
// // exports.relationshipGoal = (req, res, next) => {
// //   const schema = Joi.object({
// //     relationshipGoal: Joi.array().items(Joi.string()).min(1).required()
// //   });

// //   validate(schema, req, res, next);
// // };




// const Joi = require("joi");

// // BASIC INFO (TIER 1 + TIER 2 combined basic fields)
// exports.basic = (req, res, next) => {
//   const schema = Joi.object({
//     nickname: Joi.string().max(50).optional(),
//     fullName: Joi.string().max(100).optional(),
//     bio: Joi.string().max(500).optional(), // Updated limit as per model
//     dob: Joi.date().iso().optional(),
//     gender: Joi.string()
//       .valid("male", "female", "non-binary", "trans-man", "trans-women", "genderqueer", "everyone", "other")
//       .optional(),
//     relationshipGoals: Joi.array()
//       .items(Joi.string().valid("dating", "friendship", "casual", "serious", "networking", "open_to_options"))
//       .min(1)
//       .optional(), // Controller already validates required
//   });

//   validate(schema, req, res, next);
// };

// // LOCATION (GeoJSON structure support)
// exports.location = (req, res, next) => {
//   const schema = Joi.object({
//     latitude: Joi.number().required(),
//     longitude: Joi.number().required(),
//     city: Joi.string().optional(),
//     state: Joi.string().optional(),
//     country: Joi.string().optional()
//   });

//   validate(schema, req, res, next);
// };

// // INTERESTS (Updated constraints)
// exports.interests = (req, res, next) => {
//   const schema = Joi.object({
//     interests: Joi.array()
//       .items(Joi.string().max(50))
//       .min(3) // Updated min 3
//       .max(15) // Updated max 15
//       .required()
//   });

//   validate(schema, req, res, next);
// };

// // PREFERENCES (Updated controller matching)
// exports.preferences = (req, res, next) => {
//   const schema = Joi.object({
//     ageRange: Joi.object({
//       min: Joi.number().min(18).required(),
//       max: Joi.number().max(100).required()
//     }).optional(),

//     distanceRange: Joi.number().min(1).max(500).optional(),

//     genderPreference: Joi.array()
//       .items(Joi.string().valid("male", "female", "non-binary", "trans-man", "trans-women", "everyone", "other"))
//       .optional()
//   });

//   validate(schema, req, res, next);
// };

// // PHOTOS UPLOAD (Same structure but updated fields internally)
// exports.photoUpload = (req, res, next) => {
//   const schema = Joi.object({
//     url: Joi.string().uri().required(), // Cloudinary URLs are not always full URI
//     isPrimary: Joi.boolean().optional(),
//     order: Joi.number().min(1).optional(),
//     publicId: Joi.string().optional(),
//     uploadedAt: Joi.date().optional()
//   });

//   validate(schema, req, res, next);
// };

// // RELATIONSHIP GOAL VALIDATION (Old structure preserved, updated key)
// exports.relationshipGoal = (req, res, next) => {
//   const schema = Joi.object({
//     relationshipGoals: Joi.array()
//       .items(Joi.string().valid("dating", "friendship", "casual", "serious", "networking", "open_to_options"))
//       .min(1)
//       .required()
//   });

//   validate(schema, req, res, next);
// };

// // SELFIE UPLOAD (New added validation)
// exports.selfie = (req, res, next) => {
//   const schema = Joi.object({
//     url: Joi.string().uri().required(),
//     publicId: Joi.string().required(),
//     uploadedAt: Joi.date().optional()
//   });

//   validate(schema, req, res, next);
// };

// // ID DOCUMENT UPLOAD (New added validation)
// exports.idDocument = (req, res, next) => {
//   const schema = Joi.object({
//     idType: Joi.string().valid("driving_license", "passport", "proof_of_age").required(),
//     frontUrl: Joi.string().uri().required(),
//     backUrl: Joi.string().uri().optional(),
//     uploadedAt: Joi.date().optional()
//   });

//   validate(schema, req, res, next);
// };

// // COMMON VALIDATOR (Unchanged)
// function validate(schema, req, res, next) {
//   const { error } = schema.validate(req.body);
//   if (error) return res.status(400).json({ message: error.details[0].message });
//   next();
// }

const Joi = require("joi");

// ========================================
// ENUM CONSTANTS (Match with Schema)
// ========================================
const VALID_GENDERS = [
  "male",
  "female",
  "non-binary",
  "trans-man",
  "trans-women",
  "genderqueer",
  "everyone",
  "other"
];

const VALID_RELATIONSHIP_GOALS = [
  "dating",
  "friendship",
  "casual",
  "serious",
  "networking",
  "open_to_options"
];

const VALID_RELIGIOUS_BELIEFS = [
  "atheist",
  "agnostic",
  "christian",
  "muslim",
  "hindu",
  "buddhist",
  "jewish",
  "sikh",
  "spiritual",
  "other",
  "prefer_not_to_say"
];

const VALID_ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];

const VALID_SMOKING_OPTIONS = [
  "never",
  "socially",
  "regularly",
  "trying_to_quit"
];

const VALID_DRINKING_OPTIONS = [
  "never",
  "socially",
  "regularly"
];

const VALID_EXERCISE_OPTIONS = [
  "never",
  "sometimes",
  "regularly",
  "daily"
];

const VALID_COMMUNICATION_STYLES = [
  "frequent_texter",
  "phone_caller",
  "video_chatter",
  "in_person"
];

const VALID_MUSIC_GENRES = [
  "pop",
  "rock",
  "hip_hop",
  "classical",
  "jazz",
  "country",
  "electronic",
  "indie",
  "r&b",
  "folk",
  "metal",
  "other"
];

const VALID_BOOK_GENRES = [
  "fiction",
  "non_fiction",
  "mystery",
  "romance",
  "sci_fi",
  "fantasy",
  "biography",
  "self_help",
  "poetry",
  "other"
];

const VALID_TRAVEL_PREFERENCES = [
  "adventure",
  "relaxation",
  "cultural",
  "budget",
  "luxury",
  "road_trips",
  "international",
  "domestic"
];

const VALID_EDUCATION_LEVELS = [
  "high_school",
  "bachelors",
  "masters",
  "phd",
  "trade_school",
  "prefer_not_to_say"
];

const VALID_ID_TYPES = [
  "driving_license",
  "passport",
  "proof_of_age"
];

// ========================================
// MAIN VALIDATION: Unified Profile Update
// ========================================

/**
 * Validates the unified profile update endpoint
 * Allows any combination of profile fields
 */
exports.validateProfileUpdate = (req, res, next) => {
  const schema = Joi.object({
    // ====================================
    // TIER 1: MANDATORY FIELDS
    // ====================================

    // Basic Info
    nickname: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .pattern(/^[a-zA-Z0-9_]+$/)
      .messages({
        "string.min": "Nickname must be at least 2 characters",
        "string.max": "Nickname cannot exceed 50 characters",
        "string.pattern.base": "Nickname can only contain letters, numbers, and underscores",
        "string.empty": "Nickname cannot be empty"
      }),

    fullName: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .messages({
        "string.min": "Full name must be at least 2 characters",
        "string.max": "Full name cannot exceed 100 characters"
      }),

    bio: Joi.string()
      .max(500)
      .trim()
      .allow("")
      .messages({
        "string.max": "Bio cannot exceed 500 characters"
      }),

    dob: Joi.date()
      .iso()
      .max("now")
      .custom((value, helpers) => {
        const age = calculateAge(value);
        if (age < 18) {
          return helpers.error("any.invalid", {
            message: "You must be at least 18 years old"
          });
        }
        if (age > 100) {
          return helpers.error("any.invalid", {
            message: "Please enter a valid date of birth"
          });
        }
        return value;
      })
      .messages({
        "date.max": "Date of birth cannot be in the future",
        "date.format": "Please enter a valid date (YYYY-MM-DD)"
      }),

    gender: Joi.string()
      .valid(...VALID_GENDERS)
      .messages({
        "any.only": `Gender must be one of: ${VALID_GENDERS.join(", ")}`
      }),

    // Relationship Goals
    relationshipGoals: Joi.array()
      .items(Joi.string().valid(...VALID_RELATIONSHIP_GOALS))
      .min(1)
      .max(3)
      .unique()
      .messages({
        "array.min": "Please select at least 1 relationship goal",
        "array.max": "You can select maximum 3 relationship goals",
        "array.unique": "Duplicate relationship goals are not allowed",
        "any.only": `Invalid relationship goal. Valid options: ${VALID_RELATIONSHIP_GOALS.join(", ")}`
      }),

    // Gender Preference
    genderPreference: Joi.array()
      .items(Joi.string().valid(...VALID_GENDERS))
      .min(1)
      .max(5)
      .unique()
      .messages({
        "array.min": "Please select at least 1 gender preference",
        "array.max": "Maximum 5 gender preferences allowed",
        "array.unique": "Duplicate selections not allowed",
        "any.only": `Invalid gender option. Valid options: ${VALID_GENDERS.join(", ")}`
      }),

    // Age Range
    ageRange: Joi.object({
      min: Joi.number()
        .integer()
        .min(18)
        .max(100)
        .required()
        .messages({
          "number.min": "Minimum age must be at least 18",
          "number.max": "Maximum age cannot exceed 100",
          "any.required": "Minimum age is required"
        }),
      max: Joi.number()
        .integer()
        .min(18)
        .max(100)
        .required()
        .greater(Joi.ref("min"))
        .messages({
          "number.min": "Maximum age must be at least 18",
          "number.max": "Maximum age cannot exceed 100",
          "number.greater": "Maximum age must be greater than minimum age",
          "any.required": "Maximum age is required"
        })
    }).messages({
      "object.base": "Age range must be an object with min and max values"
    }),

    // Distance Range
    distanceRange: Joi.number()
      .integer()
      .min(1)
      .max(500)
      .messages({
        "number.min": "Distance must be at least 1 km",
        "number.max": "Distance cannot exceed 500 km",
        "number.base": "Distance must be a number"
      }),

    // Interests
    interests: Joi.array()
      .items(Joi.string().trim().min(2).max(50))
      .min(3)
      .max(15)
      .unique()
      .messages({
        "array.min": "Please select at least 3 interests",
        "array.max": "Maximum 15 interests allowed",
        "array.unique": "Duplicate interests not allowed",
        "string.min": "Each interest must be at least 2 characters",
        "string.max": "Each interest cannot exceed 50 characters"
      }),

    // ====================================
    // TIER 2: OPTIONAL FIELDS
    // ====================================

    // Lifestyle
    lifestyle: Joi.object({
      religiousBeliefs: Joi.string()
        .valid(...VALID_RELIGIOUS_BELIEFS)
        .messages({
          "any.only": `Invalid religious belief. Valid options: ${VALID_RELIGIOUS_BELIEFS.join(", ")}`
        }),

      zodiacSign: Joi.string()
        .valid(...VALID_ZODIAC_SIGNS)
        .messages({
          "any.only": `Invalid zodiac sign. Valid options: ${VALID_ZODIAC_SIGNS.join(", ")}`
        }),

      smoking: Joi.string()
        .valid(...VALID_SMOKING_OPTIONS)
        .messages({
          "any.only": `Invalid smoking option. Valid options: ${VALID_SMOKING_OPTIONS.join(", ")}`
        }),

      drinking: Joi.string()
        .valid(...VALID_DRINKING_OPTIONS)
        .messages({
          "any.only": `Invalid drinking option. Valid options: ${VALID_DRINKING_OPTIONS.join(", ")}`
        }),

      exercise: Joi.string()
        .valid(...VALID_EXERCISE_OPTIONS)
        .messages({
          "any.only": `Invalid exercise option. Valid options: ${VALID_EXERCISE_OPTIONS.join(", ")}`
        })
    }).messages({
      "object.base": "Lifestyle must be an object"
    }),

    // Languages
    languages: Joi.array()
      .items(Joi.string().trim().min(2).max(50))
      .min(1)
      .max(10)
      .unique()
      .messages({
        "array.min": "Please select at least 1 language",
        "array.max": "Maximum 10 languages allowed",
        "array.unique": "Duplicate languages not allowed"
      }),

    // Education
    education: Joi.object({
      level: Joi.string()
        .valid(...VALID_EDUCATION_LEVELS)
        .messages({
          "any.only": `Invalid education level. Valid options: ${VALID_EDUCATION_LEVELS.join(", ")}`
        }),

      institution: Joi.string()
        .trim()
        .max(200)
        .messages({
          "string.max": "Institution name cannot exceed 200 characters"
        })
    }).messages({
      "object.base": "Education must be an object"
    }),

    // Communication Style
    communicationStyle: Joi.string()
      .valid(...VALID_COMMUNICATION_STYLES)
      .messages({
        "any.only": `Invalid communication style. Valid options: ${VALID_COMMUNICATION_STYLES.join(", ")}`
      }),

    // Music Preference
    musicPreference: Joi.array()
      .items(Joi.string().valid(...VALID_MUSIC_GENRES))
      .min(1)
      .max(10)
      .unique()
      .messages({
        "array.min": "Please select at least 1 music genre",
        "array.max": "Maximum 10 music genres allowed",
        "array.unique": "Duplicate genres not allowed",
        "any.only": `Invalid music genre. Valid options: ${VALID_MUSIC_GENRES.join(", ")}`
      }),

    // Book Preference
    bookPreference: Joi.array()
      .items(Joi.string().valid(...VALID_BOOK_GENRES))
      .min(1)
      .max(10)
      .unique()
      .messages({
        "array.min": "Please select at least 1 book genre",
        "array.max": "Maximum 10 book genres allowed",
        "array.unique": "Duplicate genres not allowed",
        "any.only": `Invalid book genre. Valid options: ${VALID_BOOK_GENRES.join(", ")}`
      }),

    // Travel Preference
    travelPreference: Joi.string()
      .valid(...VALID_TRAVEL_PREFERENCES)
      .messages({
        "any.only": `Invalid travel preference. Valid options: ${VALID_TRAVEL_PREFERENCES.join(", ")}`
      })
  })
    // Allow any of these fields, but at least one must be present
    .min(1)
    .messages({
      "object.min": "Please provide at least one field to update"
    });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false, // Return all errors, not just first
    stripUnknown: true // Remove unknown fields
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: errors
    });
  }

  // Replace req.body with validated & sanitized data
  req.body = value;
  next();
};

// ========================================
// LOCATION VALIDATION
// ========================================

exports.validateLocation = (req, res, next) => {
  const schema = Joi.object({
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .required()
      .messages({
        "number.min": "Latitude must be between -90 and 90",
        "number.max": "Latitude must be between -90 and 90",
        "any.required": "Latitude is required",
        "number.base": "Latitude must be a number"
      }),

    longitude: Joi.number()
      .min(-180)
      .max(180)
      .required()
      .messages({
        "number.min": "Longitude must be between -180 and 180",
        "number.max": "Longitude must be between -180 and 180",
        "any.required": "Longitude is required",
        "number.base": "Longitude must be a number"
      }),

    city: Joi.string()
      .trim()
      .max(100)
      .messages({
        "string.max": "City name cannot exceed 100 characters"
      }),

    state: Joi.string()
      .trim()
      .max(100)
      .messages({
        "string.max": "State name cannot exceed 100 characters"
      }),

    country: Joi.string()
      .trim()
      .max(100)
      .messages({
        "string.max": "Country name cannot exceed 100 characters"
      })
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: error.details[0].message,
      field: error.details[0].path.join(".")
    });
  }

  req.body = value;
  next();
};

// ========================================
// KYC VALIDATION
// ========================================

exports.validateIDUpload = (req, res, next) => {
  const schema = Joi.object({
    idType: Joi.string()
      .valid(...VALID_ID_TYPES)
      .required()
      .messages({
        "any.only": `Invalid ID type. Valid options: ${VALID_ID_TYPES.join(", ")}`,
        "any.required": "ID type is required"
      })
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: error.details[0].message
    });
  }

  // Validate files
  if (!req.files || !req.files.front) {
    return res.status(400).json({
      success: false,
      code: "MISSING_FILE",
      message: "Front image of ID is required"
    });
  }

  // Validate file types
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
  const frontFile = req.files.front[0];

  if (!allowedMimes.includes(frontFile.mimetype)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_FILE_TYPE",
      message: "Only JPG, JPEG, and PNG files are allowed"
    });
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (frontFile.size > maxSize) {
    return res.status(400).json({
      success: false,
      code: "FILE_TOO_LARGE",
      message: "File size must be less than 5MB"
    });
  }

  // Validate back image if provided
  if (req.files.back) {
    const backFile = req.files.back[0];

    if (!allowedMimes.includes(backFile.mimetype)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_FILE_TYPE",
        message: "Only JPG, JPEG, and PNG files are allowed for back image"
      });
    }

    if (backFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        code: "FILE_TOO_LARGE",
        message: "Back image size must be less than 5MB"
      });
    }
  }

  req.body = value;
  next();
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// ========================================
// EXPORT ENUMS (for frontend reference)
// ========================================

exports.ENUMS = {
  GENDERS: VALID_GENDERS,
  RELATIONSHIP_GOALS: VALID_RELATIONSHIP_GOALS,
  RELIGIOUS_BELIEFS: VALID_RELIGIOUS_BELIEFS,
  ZODIAC_SIGNS: VALID_ZODIAC_SIGNS,
  SMOKING_OPTIONS: VALID_SMOKING_OPTIONS,
  DRINKING_OPTIONS: VALID_DRINKING_OPTIONS,
  EXERCISE_OPTIONS: VALID_EXERCISE_OPTIONS,
  COMMUNICATION_STYLES: VALID_COMMUNICATION_STYLES,
  MUSIC_GENRES: VALID_MUSIC_GENRES,
  BOOK_GENRES: VALID_BOOK_GENRES,
  TRAVEL_PREFERENCES: VALID_TRAVEL_PREFERENCES,
  EDUCATION_LEVELS: VALID_EDUCATION_LEVELS,
  ID_TYPES: VALID_ID_TYPES
};