// content.validation.js
const Joi = require("joi");

const sectionSchema = Joi.object({
  heading: Joi.string().required(),
  body: Joi.string().required(),
});

const faqSchema = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().required(),
});

exports.upsertContent = Joi.object({
  title: Joi.string().optional(),

  sections: Joi.array().items(sectionSchema).optional(),

  faqs: Joi.array().items(faqSchema).optional(),
});
