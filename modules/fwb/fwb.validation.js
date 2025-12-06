const Joi = require("joi");

const fwbValidation = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  discount: Joi.string().min(2).max(50).required(),
  website: Joi.string().uri().required(),
  code: Joi.string().min(2).max(50).required(),
  com_logo: Joi.string(),
  prod_img: Joi.string(),
  expire_time: Joi.date().greater("now").required(),
  off_details: Joi.object({
    description: Joi.array().items(Joi.string().min(3)).min(1).required(),
    note: Joi.string().allow("", null),
  }).required(),
  about_des: Joi.string().allow("", null),
  is_active: Joi.boolean().optional(),
  // myapp.com/fwb/wrangler [not use this] -> myapp.com/fwb/67236b163f8e9dd9230c7a32
  slug: Joi.string().allow("", null), // optional because auto-set in schema
});

const fwbUpdateValidation = Joi.object({
  id: Joi.string().optional(), // for update only
  name: Joi.string().min(2).max(100),
  discount: Joi.string().min(2).max(50),
  website: Joi.string().uri(),
  code: Joi.string().min(2).max(50),
  com_logo: Joi.string(),
  prod_img: Joi.string(),
  expire_time: Joi.date().greater("now"),
  off_details: Joi.object({
    description: Joi.array().items(Joi.string().min(3)).min(1),
    note: Joi.string().allow("", null),
  }),
  about_des: Joi.string().allow("", null),
  is_active: Joi.boolean().optional(),
  // myapp.com/fwb/wrangler [not use this] -> myapp.com/fwb/67236b163f8e9dd9230c7a32
  slug: Joi.string().allow("", null), // optional because auto-set in schema
});

module.exports = { fwbValidation, fwbUpdateValidation };
