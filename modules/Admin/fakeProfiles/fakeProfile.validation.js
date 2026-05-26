const Joi = require("joi");

const bulkCreateSchema = Joi.object({
    count: Joi.number().integer().min(1).max(500).default(10),
    gender: Joi.string().valid("men", "women", "non-binary", "trans-man", "trans-women", "genderqueer", "everyone").required(),
    ageRange: Joi.object({
        min: Joi.number().integer().min(18).max(60).default(22),
        max: Joi.number().integer().min(18).max(60).default(35)
    }).default({ min: 22, max: 35 }),
    city: Joi.string().valid("Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra").default("Sydney")
});

const listQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    gender: Joi.string().valid("men", "women", "non-binary", "trans-man", "trans-women", "genderqueer", "all").default("all"),
    batchId: Joi.string().optional(),
    status: Joi.string().valid("active", "deactivated", "all").default("all"),
    search: Joi.string().trim().allow("").optional(),
    city: Joi.string().valid("Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "all").default("all"),
    sortBy: Joi.string().valid("createdAt", "nickname", "gender", "city", "accountStatus").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    isPremium: Joi.string().valid("true", "false").optional()
});

module.exports = {
    bulkCreateSchema,
    listQuerySchema
};