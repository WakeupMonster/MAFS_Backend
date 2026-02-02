// validations/adminUserList.validation.js
const Joi = require("joi");

module.exports.adminUserListSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(50).default(20),

  search: Joi.string().allow("", null),

  accountStatus: Joi.string()
    .valid("active", "blocked", "deactivated")
    .optional(),

  isPremium: Joi.boolean().optional(),

  gender: Joi.string().valid("male", "female", "other").optional(),

  kycStatus: Joi.string().valid("pending", "approved", "rejected").optional(),

  profileComplete: Joi.boolean().optional(),

  sort: Joi.string()
    .valid("createdAt", "updatedAt", "lastProfileUpdate")
    .default("createdAt"),
});

module.exports.updateUserSchema = Joi.object({
  accountStatus: Joi.string()
    .valid("active", "deactivated", "married", "deleted", "banned")
    .messages({
      "any.only":
        "Account status must be one of: active, deactivated, married, deleted, or banned",
    }),

  isPremium: Joi.boolean().messages({
    "boolean.base": "isPremium must be a true or false value",
  }),

  profile: Joi.object({
    nickname: Joi.string().trim().max(50).allow(""),
    gender: Joi.string().trim().allow(""),
    dob: Joi.date(),
    age: Joi.number().integer().min(18).max(100),
    height: Joi.number().allow(null),
    about: Joi.string().max(500).allow(""),
    jobTitle: Joi.string().allow(null, ""),
    company: Joi.string().allow(null, ""),
    school: Joi.string().allow(null, ""),
    livingIn: Joi.string().allow(null, ""),

    // Nested Attributes (Zodiac, Religion, etc.)
    attributes: Joi.object({
      zodiac: Joi.string().allow(null, ""),
      religion: Joi.string().allow(null, ""),
      education: Joi.string().allow(null, ""),
      smoking: Joi.string().allow(null, ""),
      drinking: Joi.string().allow(null, ""),
      interests: Joi.array().items(Joi.string()),
    }).unknown(true), // Allows other attribute fields without strict validation

    location: Joi.object({
      city: Joi.string().allow(null, ""),
      country: Joi.string().allow(null, ""),
      full_address: Joi.string().allow(null, ""),
    }).unknown(true),
  }).required(),
});
