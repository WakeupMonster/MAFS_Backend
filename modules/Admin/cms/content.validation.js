// validations/faq.validation.js
const Joi = require("joi");
const { FAQ_CATEGORIES } = require("../../../common/constants/faqCategory");

exports.getFaqSchema = Joi.object({
  category: Joi.string()
    .valid(...FAQ_CATEGORIES)
    .optional(),
});

exports.createFaq = Joi.object({
  question: Joi.string().min(5).required(),
  answer: Joi.string().min(5).required(),
  category: Joi.string()
    .valid(
      "general",
      "account",
      "dating",
      "subscriptions",
      "troubleshooting",
      "security_privacy",
      "safety_reporting",
      "other"
    )
    .required(),
  order: Joi.number().integer().min(0).required(),
});

exports.updateFaq = Joi.object({
  question: Joi.string().min(5).optional(),
  answer: Joi.string().min(5).optional(),
  category: Joi.string()
    .valid(
      "general",
      "account",
      "dating",
      "subscriptions",
      "troubleshooting",
      "security_privacy",
      "safety_reporting",
      "other"
    )
    .required(),
  order: Joi.number().integer().min(0).required(),
});

/*===================================
 *==== SECTION VALIDATION (COMMON
 ===================================*/
const sectionSchema = Joi.object({
  order: Joi.number().integer().min(1).required(),
  heading: Joi.string().trim().min(3).max(200).required(),
  paragraph: Joi.string().trim().allow(),
  list: Joi.array().items(Joi.string().trim().min(3)).optional(),
});

/*==================================
 *==== ADD SECTION
 ===================================*/
exports.addSectionSchema = Joi.object({
  order: Joi.number().integer().min(1).required(),
  heading: Joi.string().trim().min(3).max(200).required(),
  paragraph: Joi.string().trim().allow(""),
  list: Joi.array()
    .items(Joi.string().trim().min(2).max(300))
    .optional()
    .default([]),
});

/*===================================
 *==== UPDATE SECTION (PARTIAL)
 ====================================*/
exports.updateSectionSchema = Joi.object({
  order: Joi.number().integer().min(1).optional(),
  heading: Joi.string().trim().min(3).max(200).optional(),
  paragraph: Joi.string().trim().min(10).allow(""),
  list: Joi.array().items(Joi.string().trim()).optional(),
}).min(1); // 👈 at least one field required

/*=================================
 *===== UPSERT FULL PRIVACY POLICY
 ==================================*/
exports.upsertPrivacySchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional(),
  sections: Joi.array().items(sectionSchema).min(1).required(),
});
