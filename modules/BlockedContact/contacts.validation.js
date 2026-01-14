// const Joi = require("joi");

// exports.importContactsSchema = {
//   body: Joi.object({
//     contacts: Joi.array()
//       .items(Joi.string().min(12))
//       .max(5000)
//       .required()
//   })
// };

// exports.blockContactsSchema = {
//   body: Joi.object({
//     phones: Joi.array()
//       .items(Joi.string().min(6))
//       .min(1)
//       .required()
//   })
// };


const Joi = require("joi");

const contactSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      "string.base": "Contact name must be a string",
      "string.min": "Contact name cannot be empty",
      "string.max": "Contact name is too long"
    }),

  phone: Joi.string()
    .trim()
    .min(6)
    .max(20)
    .required()
    .messages({
      "string.base": "Phone number must be a string",
      "string.empty": "Phone number is required",
      "any.required": "Phone number is required"
    })
});

exports.importContactsSchema = {
  body: Joi.object({
    contacts: Joi.array()
      .items(contactSchema)
      .min(1)
      .max(5000)
      .required()
      .messages({
        "array.base": "Contacts must be an array",
        "array.min": "At least one contact is required",
        "array.max": "Maximum 5000 contacts allowed",
        "any.required": "Contacts field is required"
      })
  })
};
