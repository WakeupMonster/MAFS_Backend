const Joi = require("joi");

const bulkCreateSchema = Joi.object({
    count: Joi.number().integer().min(1).max(500).default(10),
    gender: Joi.string().valid("men", "women", "non-binary", "trans-man", "trans-women", "genderqueer", "everyone").required(),
    ageRange: Joi.object({
        min: Joi.number().integer().min(18).max(60).default(22),
        max: Joi.number().integer().min(18).max(60).default(35)
    }).default({ min: 22, max: 35 }),
    // City is now a free-text string — validated at the service layer against DB + hardcoded list
    city: Joi.string().trim().required()
});

const listQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    gender: Joi.string().valid("men", "women", "non-binary", "trans-man", "trans-women", "genderqueer", "all").default("all"),
    batchId: Joi.string().optional(),
    status: Joi.string().valid("active", "deactivated", "all").default("all"),
    search: Joi.string().trim().allow("").optional(),
    // City filter is now a free-text string — "all" still means no filter
    city: Joi.string().trim().default("all"),
    sortBy: Joi.string().valid("createdAt", "nickname", "gender", "city", "accountStatus").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    isPremium: Joi.string().valid("true", "false").optional()
});

// Schema for adding a new Australian city
// lat/lng are enforced to Australia's bounding box as a safety net
const addCitySchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required()
        .messages({ "string.min": "City name must be at least 2 characters" }),
    state: Joi.string().trim().min(2).max(50).required(),
    lat: Joi.number().min(-45).max(-9).required()
        .messages({ "number.min": "Latitude must be within Australia", "number.max": "Latitude must be within Australia" }),
    lng: Joi.number().min(112).max(155).required()
        .messages({ "number.min": "Longitude must be within Australia", "number.max": "Longitude must be within Australia" }),
});

module.exports = {
    bulkCreateSchema,
    listQuerySchema,
    addCitySchema
};