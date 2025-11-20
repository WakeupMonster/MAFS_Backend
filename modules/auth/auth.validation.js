// const Joi = require("joi");

// const phoneSchema = Joi.object({
//   phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required()
// });

// const otpSchema = Joi.object({
//   phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required(),
//   otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
// });

// const emailSchema = Joi.object({
//   userId: Joi.string().required(),
//   email: Joi.string().email().required()
// });

// module.exports.validatePhone = (req, res, next) => {
//   const { error } = phoneSchema.validate(req.body);
//   if (error) return res.status(400).json({ success: false, message: error.message });
//   next();
// };

// module.exports.validateOtp = (req, res, next) => {
//   const { error } = otpSchema.validate(req.body);
//   if (error) return res.status(400).json({ success: false, message: error.message });
//   next();
// };

// module.exports.validateEmail = (req, res, next) => {
//   const { error } = emailSchema.validate(req.body);
//   if (error) return res.status(400).json({ success: false, message: error.message });
//   next();
// }; 


const Joi = require("joi");

const phoneSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^(\+91)?[6-9][0-9]{9}$/)
    .required()
});

const otpSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required(),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
});

const emailSchema = Joi.object({
  userId: Joi.string().required(),
  email: Joi.string().email().required()
});

module.exports.validatePhone = (req, res, next) => {
  const { error } = phoneSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });
  next();
};

module.exports.validateOtp = (req, res, next) => {
  const { error } = otpSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });
  next();
};

module.exports.validateEmail = (req, res, next) => {
  const { error } = emailSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });
  next();
};