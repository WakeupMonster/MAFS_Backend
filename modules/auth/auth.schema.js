const Joi = require("joi");

const phoneE164Regex = /^\+[1-9]\d{9,14}$/;

module.exports.sendPhoneOtpSchema = Joi.object({
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


module.exports.verifyOtpSchema = Joi.object({
  phone: Joi.string().required(),
  otp: Joi.string().length(6).required().messages({
    "string.length": "OTP must be 6 digits"
  })
});

const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

module.exports.registerEmailSchema = Joi.object({
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

module.exports.refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required"
  })
});


module.exports.logoutSchema = Joi.object({
  refreshToken: Joi.string().required(),
  deviceId: Joi.string().required(), // Added deviceId to accurately unregister FCM token
});







// const Joi = require("joi");


// const australiaMobileRegex = /^\+614\d{8}$/;

// const otpRegex = /^\d{6}$/;


// const emailRegex =
//   /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;


// const refreshTokenSchema = Joi.string()
//   .min(20)
//   .required()
//   .messages({
//     "any.required": "Refresh token is required",
//     "string.min": "Invalid refresh token"
//   });


// module.exports.sendPhoneOtpSchema = Joi.object({
//   phone: Joi.string()
//     .trim()
//     .pattern(australiaMobileRegex)
//     .required()
//     .messages({
//       "any.required": "Phone number is required",
//       "string.empty": "Phone number is required",
//       "string.pattern.base":
//         "Phone number must be a valid Australian mobile number (+614XXXXXXXX)"
//     })
// });


// module.exports.verifyOtpSchema = Joi.object({
//   phone: Joi.string()
//     .trim()
//     .pattern(australiaMobileRegex)
//     .required()
//     .messages({
//       "string.pattern.base":
//         "Phone number must be a valid Australian mobile number (+614XXXXXXXX)"
//     }),

//   otp: Joi.string()
//     .pattern(otpRegex)
//     .required()
//     .messages({
//       "any.required": "OTP is required",
//       "string.pattern.base": "OTP must be a 6-digit number"
//     })
// });


// module.exports.registerEmailSchema = Joi.object({
//   email: Joi.string()
//     .trim()
//     .lowercase()
//     .pattern(emailRegex)
//     .required()
//     .messages({
//       "any.required": "Email is required",
//       "string.empty": "Email is required",
//       "string.pattern.base": "Invalid email address"
//     })
// });


// module.exports.refreshTokenSchema = Joi.object({
//   refreshToken: refreshTokenSchema
// });


// module.exports.logoutSchema = Joi.object({
//   refreshToken: refreshTokenSchema
// });
