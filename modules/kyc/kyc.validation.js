// src/modules/kyc/kyc.validation.js

const Joi = require("joi");

module.exports.submitKycSchema = Joi.object({
  userId: Joi.string().required(),
  selfieUrl: Joi.string().uri().required()
});
