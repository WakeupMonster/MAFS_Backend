/**
 * Social Authentication Validation
 * Input validation for social login endpoints
 */

const Joi = require("joi");

/**
 * Validate social login request
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
module.exports.validateSocialLogin = (req, res, next) => {
  try {
    const schema = Joi.object({
      provider: Joi.string()
        .valid("google", "facebook", "apple")
        .required()
        .messages({
          "any.required": "Provider is required",
          "any.only": "Provider must be 'google', 'facebook', or 'apple'"
        }),

      idToken: Joi.string()
        .when("provider", {
          is: Joi.string().valid("google", "apple"),
          then: Joi.required(),
          otherwise: Joi.optional()
        })
        .messages({
          "any.required": "ID token is required for this provider"
        }),

      accessToken: Joi.string()
        .when("provider", {
          is: "facebook",
          then: Joi.required(),
          otherwise: Joi.optional()
        })
        .messages({
          "any.required": "Access token is required for Facebook"
        }),

      deviceId: Joi.string()
        .optional()
        .max(255),

      fcmToken: Joi.string()
        .optional()
        .max(500)
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
        code: "VALIDATION_ERROR"
      });
    }

    req.body = value;
    next();

  } catch (err) {
    console.error("❌ Validation error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Validation error",
      code: "INTERNAL_ERROR"
    });
  }
};

/**
 * Validate social link request
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
module.exports.validateSocialLink = (req, res, next) => {
  try {
    const schema = Joi.object({
      provider: Joi.string()
        .valid("google", "facebook", "apple")
        .required()
        .messages({
          "any.required": "Provider is required",
          "any.only": "Provider must be 'google', 'facebook', or 'apple'"
        }),

      idToken: Joi.string()
        .when("provider", {
          is: Joi.string().valid("google", "apple"),
          then: Joi.required(),
          otherwise: Joi.optional()
        })
        .messages({
          "any.required": "ID token is required for this provider"
        }),

      accessToken: Joi.string()
        .when("provider", {
          is: "facebook",
          then: Joi.required(),
          otherwise: Joi.optional()
        })
        .messages({
          "any.required": "Access token is required for Facebook"
        })
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
        code: "VALIDATION_ERROR"
      });
    }

    req.body = value;
    next();

  } catch (err) {
    console.error("❌ Validation error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Validation error",
      code: "INTERNAL_ERROR"
    });
  }
};

/**
 * Validate social unlink request
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
module.exports.validateSocialUnlink = (req, res, next) => {
  try {
    const schema = Joi.object({
      provider: Joi.string()
        .valid("google", "facebook", "apple")
        .required()
        .messages({
          "any.required": "Provider is required",
          "any.only": "Provider must be 'google', 'facebook', or 'apple'"
        })
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
        code: "VALIDATION_ERROR"
      });
    }

    req.body = value;
    next();

  } catch (err) {
    console.error("❌ Validation error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Validation error",
      code: "INTERNAL_ERROR"
    });
  }
};
