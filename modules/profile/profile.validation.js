const Joi = require("joi");

// ========================================
// ENUMS
// ========================================
const VALID_GENDERS = ["male", "female", "non-binary", "trans-man", "trans-women", "genderqueer", "everyone", "other"];
const VALID_RELATIONSHIP_GOALS = ["dating", "friendship", "casual", "serious", "networking", "open_to_options"];
const VALID_RELIGIOUS_BELIEFS = ["atheist", "agnostic", "christian", "muslim", "hindu", "buddhist", "jewish", "sikh", "spiritual", "other", "prefer_not_to_say"];
const VALID_ZODIAC_SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const VALID_SMOKING_OPTIONS = ["never", "socially", "regularly", "trying_to_quit"];
const VALID_DRINKING_OPTIONS = ["never", "socially", "regularly"];
const VALID_EXERCISE_OPTIONS = ["never", "sometimes", "regularly", "daily"];
const VALID_COMMUNICATION_STYLES = ["frequent_texter", "phone_caller", "video_chatter", "in_person"];
const VALID_MUSIC_GENRES = ["pop", "rock", "hip_hop", "classical", "jazz", "country", "electronic", "indie", "r&b", "folk", "metal", "other"];
const VALID_BOOK_GENRES = ["fiction", "non_fiction", "mystery", "romance", "sci_fi", "fantasy", "biography", "self_help", "poetry", "other"];
const VALID_TRAVEL_PREFERENCES = ["adventure", "relaxation", "cultural", "budget", "luxury", "road_trips", "international", "domestic"];
const VALID_EDUCATION_LEVELS = ["high_school", "bachelors", "masters", "phd", "trade_school", "prefer_not_to_say"];
const VALID_ID_TYPES = ["driving_license", "passport", "proof_of_age"];

// ========================================
// UNIFIED PROFILE UPDATE VALIDATION
// ========================================

exports.validateProfileUpdate = (req, res, next) => {
  const schema = Joi.object({
    // Basic Info
    nickname: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .pattern(/^[a-zA-Z0-9_]+$/)
      .messages({
        "string.min": "Nickname must be at least 2 characters",
        "string.max": "Nickname cannot exceed 50 characters",
        "string.pattern.base": "Nickname can only contain letters, numbers and underscores",
        "string.empty": "Nickname cannot be empty"
      }),

    fullName: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 100 characters"
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
        if (age < 18) return helpers.error("any.invalid");
        if (age > 100) return helpers.error("any.invalid");
        return value;
      })
      .messages({
        "date.max": "Date of birth cannot be in the future",
        "any.invalid": "You must be at least 18 years old"
      }),

    gender: Joi.string()
      .valid(...VALID_GENDERS)
      .messages({
        "any.only": "Please select a valid gender option"
      }),

    relationshipGoals: Joi.array()
      .items(Joi.string().valid(...VALID_RELATIONSHIP_GOALS))
      .min(1)
      .max(3)
      .unique()
      .messages({
        "array.min": "Please select at least 1 relationship goal",
        "array.max": "Maximum 3 relationship goals allowed",
        "array.unique": "Duplicate selections not allowed",
        "any.only": "Invalid relationship goal selected"
      }),

    genderPreference: Joi.array()
      .items(Joi.string().valid(...VALID_GENDERS))
      .min(1)
      .max(5)
      .unique()
      .messages({
        "array.min": "Please select at least 1 gender preference",
        "array.max": "Maximum 5 selections allowed",
        "array.unique": "Duplicate selections not allowed",
        "any.only": "Invalid gender preference selected"
      }),

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
    }),

    distanceRange: Joi.number()
      .integer()
      .min(1)
      .max(500)
      .messages({
        "number.min": "Distance must be at least 1 km",
        "number.max": "Distance cannot exceed 500 km"
      }),

    interests: Joi.array()
      .items(Joi.string().trim().min(2).max(50))
      .min(3)
      .max(15)
      .unique()
      .messages({
        "array.min": "Please select at least 3 interests",
        "array.max": "Maximum 15 interests allowed",
        "array.unique": "Duplicate interests not allowed"
      }),

    // Lifestyle
    lifestyle: Joi.object({
      religiousBeliefs: Joi.string().valid(...VALID_RELIGIOUS_BELIEFS).messages({ "any.only": "Invalid religious belief" }),
      zodiacSign: Joi.string().valid(...VALID_ZODIAC_SIGNS).messages({ "any.only": "Invalid zodiac sign" }),
      smoking: Joi.string().valid(...VALID_SMOKING_OPTIONS).messages({ "any.only": "Invalid smoking option" }),
      drinking: Joi.string().valid(...VALID_DRINKING_OPTIONS).messages({ "any.only": "Invalid drinking option" }),
      exercise: Joi.string().valid(...VALID_EXERCISE_OPTIONS).messages({ "any.only": "Invalid exercise option" })
    }),

    languages: Joi.array()
      .items(Joi.string().trim().min(2).max(50))
      .min(1)
      .max(10)
      .unique()
      .messages({
        "array.min": "Please select at least 1 language",
        "array.max": "Maximum 10 languages allowed"
      }),

    education: Joi.object({
      level: Joi.string().valid(...VALID_EDUCATION_LEVELS).messages({ "any.only": "Invalid education level" }),
      institution: Joi.string().trim().max(200).messages({ "string.max": "Institution name too long" })
    }),

    communicationStyle: Joi.string().valid(...VALID_COMMUNICATION_STYLES).messages({ "any.only": "Invalid communication style" }),
    
    musicPreference: Joi.array()
      .items(Joi.string().valid(...VALID_MUSIC_GENRES))
      .min(1)
      .max(10)
      .unique()
      .messages({
        "array.min": "Select at least 1 music genre",
        "array.max": "Maximum 10 genres allowed",
        "any.only": "Invalid music genre"
      }),

    bookPreference: Joi.array()
      .items(Joi.string().valid(...VALID_BOOK_GENRES))
      .min(1)
      .max(10)
      .unique()
      .messages({
        "array.min": "Select at least 1 book genre",
        "array.max": "Maximum 10 genres allowed",
        "any.only": "Invalid book genre"
      }),

    travelPreference: Joi.string().valid(...VALID_TRAVEL_PREFERENCES).messages({ "any.only": "Invalid travel preference" })
  })
    .min(1)
    .messages({
      "object.min": "Please provide at least one field to update"
    });

  const { error, value } = schema.validate(req.body, {
    abortEarly: true, // ✅ Stop at first error
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message // ✅ Simple string message
    });
  }

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
        "number.min": "Invalid latitude value",
        "number.max": "Invalid latitude value",
        "any.required": "Latitude is required"
      }),

    longitude: Joi.number()
      .min(-180)
      .max(180)
      .required()
      .messages({
        "number.min": "Invalid longitude value",
        "number.max": "Invalid longitude value",
        "any.required": "Longitude is required"
      }),

    city: Joi.string().trim().max(100).messages({ "string.max": "City name too long" }),
    state: Joi.string().trim().max(100).messages({ "string.max": "State name too long" }),
    country: Joi.string().trim().max(100).messages({ "string.max": "Country name too long" }),
    full_address: Joi.string().trim().max(100).messages({ "string.max": "full address name too long" })
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: true,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
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
        "any.only": "Invalid ID type. Choose from: Driving License, Passport, or Proof of Age",
        "any.required": "Please select ID type"
      })
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: true,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  // Validate files
  if (!req.files || !req.files.front) {
    return res.status(400).json({
      success: false,
      message: "Please upload front image of your ID"
    });
  }

  const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
  const frontFile = req.files.front[0];

  if (!allowedMimes.includes(frontFile.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Only JPG and PNG images are allowed"
    });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (frontFile.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: "Image size must be less than 5MB"
    });
  }

  if (req.files.back) {
    const backFile = req.files.back[0];

    if (!allowedMimes.includes(backFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Back image must be JPG or PNG format"
      });
    }

    if (backFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Back image size must be less than 5MB"
      });
    }
  }

  req.body = value;
  next();
};

// Helper
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

// Export enums
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