const Joi = require("joi");

exports.importContactsSchema = {
  body: Joi.object({
    contacts: Joi.array()
      .items(Joi.string().min(12))
      .max(5000)
      .required()
  })
};

exports.blockContactsSchema = {
  body: Joi.object({
    phones: Joi.array()
      .items(Joi.string().min(6))
      .min(1)
      .required()
  })
};