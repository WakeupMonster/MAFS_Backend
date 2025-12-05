// // const Joi = require("joi");

// // const phoneSchema = Joi.object({
// //   phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required()
// // });

// // const otpSchema = Joi.object({
// //   phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required(),
// //   otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
// // });

// // const emailSchema = Joi.object({
// //   userId: Joi.string().required(),
// //   email: Joi.string().email().required()
// // });

// // module.exports.validatePhone = (req, res, next) => {
// //   const { error } = phoneSchema.validate(req.body);
// //   if (error) return res.status(400).json({ success: false, message: error.message });
// //   next();
// // };

// // module.exports.validateOtp = (req, res, next) => {
// //   const { error } = otpSchema.validate(req.body);
// //   if (error) return res.status(400).json({ success: false, message: error.message });
// //   next();
// // };

// // module.exports.validateEmail = (req, res, next) => {
// //   const { error } = emailSchema.validate(req.body);
// //   if (error) return res.status(400).json({ success: false, message: error.message });
// //   next();
// // }; 


// const Joi = require("joi");

// const phoneSchema = Joi.object({
//   phone: Joi.string()
//     .pattern(/^(\+91)?[6-9][0-9]{9}$/)
//     .required()
// });

// const otpSchema = Joi.object({
//   phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required(),
//   otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
// });

// const emailSchema = Joi.object({
//   userId: Joi.string().required(),
//   email: Joi.string().email().required()
// });

// module.exports.validatePhone = (req, res, next) => {
//   const { error } = phoneSchema.validate(req.body);
//   if (error) return res.status(400).json({ success: false, message: error.message });
//   next();
// };

// module.exports.validateOtp = (req, res, next) => {
//   const { error } = otpSchema.validate(req.body);
//   if (error) return res.status(400).json({ success: false, message: error.message });
//   next();
// };

// module.exports.validateEmail = (req, res, next) => {
//   const { error } = emailSchema.validate(req.body);
//   if (error) return res.status(400).json({ success: false, message: error.message });
//   next();
// };


const Joi = require("joi");

// ========================================
// VALIDATION SCHEMAS
// ========================================

/**
 * Phone Number Validation
 * Supports: Indian format (+91 or without)
 */
const phoneSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9][0-9]{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be a valid 10-digit Indian mobile number starting with 6-9",
      "string.empty": "Phone number is required",
      "any.required": "Phone number is required"
    }),

  // countryCode: Joi.string()
  //   .pattern(/^\+\d{1,4}$/)
  //   .default("+91")
  //   .messages({
  //     "string.pattern.base": "Invalid country code format (e.g., +91)"
  //   })
});

/**
 * OTP Verification Validation
 */
const otpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9][0-9]{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be a valid 10-digit Indian mobile number",
      "string.empty": "Phone number is required",
      "any.required": "Phone number is required"
    }),

  countryCode: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .default("+91")
    .messages({
      "string.pattern.base": "Invalid country code format"
    }),

  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
      "string.empty": "OTP is required",
      "any.required": "OTP is required"
    })
});

/**
 * Email Registration Validation
 */
const emailSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Allow all TLDs
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.email": "Please enter a valid email address",
      "string.empty": "Email is required",
      "any.required": "Email is required"
    })
});

/**
 * Email OTP Verification Validation
 */
const emailOtpSchema = Joi.object({
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
      "string.empty": "OTP is required",
      "any.required": "OTP is required"
    })
});

/**
 * Refresh Token Validation
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      "string.empty": "Refresh token is required",
      "any.required": "Refresh token is required"
    })
});

/**
 * Logout Validation
 */
const logoutSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      "string.empty": "Refresh token is required",
      "any.required": "Refresh token is required"
    })
});

// ========================================
// VALIDATION MIDDLEWARE
// ========================================

/**
 * Validate Phone Number (Send OTP)
 * POST /api/auth/phone
 */
module.exports.validatePhone = (req, res, next) => {
  const { error, value } = phoneSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: errors[0].message, // First error as main message
      errors: errors
    });
  }

  req.body = value;
  next();
};

/**
 * Validate OTP Verification
 * POST /api/auth/verify
 */
module.exports.validateOtp = (req, res, next) => {
  const { error, value } = otpSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: errors[0].message,
      errors: errors
    });
  }

  req.body = value;
  next();
};

/**
 * Validate Email Registration
 * POST /api/auth/register/email
 */
module.exports.validateEmail = (req, res, next) => {
  const { error, value } = emailSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: errors[0].message,
      errors: errors
    });
  }

  req.body = value;
  next();
};

/**
 * Validate Email OTP
 * POST /api/auth/verify/email
 */
module.exports.validateEmailOtp = (req, res, next) => {
  const { error, value } = emailOtpSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: errors[0].message,
      errors: errors
    });
  }

  req.body = value;
  next();
};

/**
 * Validate Refresh Token
 * POST /api/auth/refresh
 */
module.exports.validateRefreshToken = (req, res, next) => {
  const { error, value } = refreshTokenSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Refresh token is required",
      errors: [
        {
          field: "refreshToken",
          message: error.details[0].message
        }
      ]
    });
  }

  req.body = value;
  next();
};

/**
 * Validate Logout
 * POST /api/auth/logout
 */
module.exports.validateLogout = (req, res, next) => {
  const { error, value } = logoutSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Refresh token is required",
      errors: [
        {
          field: "refreshToken",
          message: error.details[0].message
        }
      ]
    });
  }

  req.body = value;
  next();
};