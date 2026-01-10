const Joi = require("joi");

const adminRegisterSchema = Joi.object({
  fullName: Joi.string().min(3).max(50).required().messages({
    "string.empty": "Full name is required",
  }),
  // Email is optional but must be valid if provided
  email: Joi.string().email().lowercase().trim(),
  // Phone is optional but must be a valid format if provided
  phone: Joi.string()
    .pattern(/^[0-9+]{10,15}$/)
    .messages({
      "string.pattern.base": "Phone number must be between 10-15 digits",
    }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
  }),
  avatar: Joi.string().uri().optional(),
});
// .xor("email", "phone"); // Crucial: Ensures one is present, but allows the other to be null/undefined

const adminLoginSchema = Joi.object({
  // identifier: Joi.string().required().messages({
  //   "string.empty": "Email or Phone is required",
  // }),
  email: Joi.string().required().messages({
    "string.empty": "Email is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

const adminResetPasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current Password is required",
  }),
  newPassword: Joi.string().required().messages({
    "string.empty": "New Password is required",
  }),
});

module.exports = {
  adminRegisterSchema,
  adminLoginSchema,
  adminResetPasswordSchema,
};
