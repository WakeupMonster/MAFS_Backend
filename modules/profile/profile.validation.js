const Joi = require("joi");

// BASIC INFO
exports.basic = (req, res, next) => {
  const schema = Joi.object({
    nickname: Joi.string().max(50).optional(),
    fullName: Joi.string().max(100).optional(),
    bio: Joi.string().max(300).optional(),
    dob: Joi.date().iso().optional(),
    gender: Joi.string().valid("male", "female", "other").optional(),
  });

  validate(schema, req, res, next);
};

// LOCATION
exports.location = (req, res, next) => {
  const schema = Joi.object({
    lat: Joi.number().required(),
    lon: Joi.number().required(),
    city: Joi.string().optional(),
    country: Joi.string().optional()
  });

  validate(schema, req, res, next);
};

// INTERESTS
exports.interests = (req, res, next) => {
  const schema = Joi.object({
    interests: Joi.array().items(Joi.string()).min(1).required()
  });

  validate(schema, req, res, next);
};

// PREFERENCES
exports.preferences = (req, res, next) => {
  const schema = Joi.object({
    ageRange: Joi.object({
      min: Joi.number().min(18).required(),
      max: Joi.number().max(100).required()
    }).optional(),

    distanceRange: Joi.number().min(1).max(500).optional(),

    genderPreference: Joi.array()
      .items(Joi.string().valid("male", "female", "other"))
      .optional()
  });

  validate(schema, req, res, next);
};

// PHOTOS
exports.photoUpload = (req, res, next) => {
  const schema = Joi.object({
    url: Joi.string().uri().required(),
    isPrimary: Joi.boolean().optional(),
    order: Joi.number().optional()
  });

  validate(schema, req, res, next);
};

// COMMON VALIDATOR
function validate(schema, req, res, next) {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
}