// auth.schema.js
const Joi = require("joi");

/* ===============================
   PHONE OTP
================================ */
// exports.sendPhoneOtpSchema = Joi.object({
//   phone: Joi.string()
//     .trim()
//     .required()
//     .messages({
//       "any.required": "Phone number is required",
//       "string.empty": "Phone number cannot be empty"
//     })
// });

const phoneE164Regex = /^\+[1-9]\d{9,14}$/;

exports.sendPhoneOtpSchema = Joi.object({
  phone: Joi.string()
    .trim()
    .pattern(phoneE164Regex)
    .required()
    .messages({
      "any.required": "Phone number is required",
      "string.empty": "Phone number cannot be empty",
      "string.pattern.base": "Invalid phone number"
    })
});

/* ===============================
   VERIFY OTP
================================ */
exports.verifyOtpSchema = Joi.object({
  phone: Joi.string().required(),
  otp: Joi.string().length(6).required().messages({
    "string.length": "OTP must be 6 digits"
  })
});

const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

exports.registerEmailSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .pattern(emailRegex)
    .required()
    .messages({
      "any.required": "Email is required",
      "string.empty": "Email is required",
      "string.pattern.base": "Invalid email address"
    })
});

/* ===============================
   REFRESH TOKEN
================================ */
exports.refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required"
  })
});

/* ===============================
   LOGOUT
================================ */
exports.logoutSchema = Joi.object({
  refreshToken: Joi.string().required()
});
