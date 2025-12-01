// // src/modules/kyc/kyc.validation.js

// const Joi = require("joi");

// module.exports.submitKycSchema = Joi.object({
//   userId: Joi.string().required(),
//   selfieUrl: Joi.string().uri().required()
// });



// src/modules/kyc/kyc.validation.js
const Joi = require('joi');
// const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } = require('../../config/constants');

module.exports = {
  // Schema for KYC submission
  submitKycSchema: Joi.object({
    userId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.hex': 'User ID must be a valid MongoDB ID',
        'string.length': 'User ID must be 24 characters long',
        'any.required': 'User ID is required'
      }),

    selfieUrl: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Selfie URL must be a valid URL',
        'any.required': 'Selfie URL is required'
      }),

    idVerificationUrl: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'ID verification URL must be a valid URL',
        'any.required': 'ID verification URL is required'
      }),

    // For file upload validation (if using FormData)
    selfie: Joi.any()
      .meta({ swaggerType: 'file' })
      .optional()
      .description('Selfie image file'),

    idVerification: Joi.any()
      .meta({ swaggerType: 'file' })
      .optional()
      .description('ID verification document file')
  }).xor('selfieUrl', 'selfie') // Either URL or file, not both
   .xor('idVerificationUrl', 'idVerification')
   .with('selfie', 'idVerification')
   .with('selfieUrl', 'idVerificationUrl')
   .messages({
     'object.xor': 'Must provide either file uploads or URLs, not both',
     'object.with': 'Must provide both selfie and ID verification'
   }),

  // Schema for KYC verification (admin)
  // verifyKycSchema: Joi.object({
  //   status: Joi.string()
  //     .valid('approved', 'rejected')
  //     .required()
  //     .messages({
  //       'any.only': 'Status must be either "approved" or "rejected"',
  //       'any.required': 'Status is required'
  //     }),

  //   rejectionReason: Joi.when('status', {
  //     is: 'rejected',
  //     then: Joi.string()
  //       .min(10)
  //       .max(500)
  //       .required()
  //       .messages({
  //         'string.min': 'Rejection reason must be at least 10 characters',
  //         'string.max': 'Rejection reason must not exceed 500 characters',
  //         'any.required': 'Rejection reason is required when status is "rejected"'
  //       }),
  //     otherwise: Joi.string().allow('')
  //   })
  // }),

  // Schema for getting KYC
  getKycSchema: Joi.object({
    userId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.hex': 'User ID must be a valid MongoDB ID',
        'string.length': 'User ID must be 24 characters long',
        'any.required': 'User ID is required'
      })
  })
};