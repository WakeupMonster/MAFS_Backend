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
