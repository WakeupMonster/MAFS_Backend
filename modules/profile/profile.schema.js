const Joi = require("joi");
const mongoose = require("mongoose");

/* ===============================
   COMMON HELPERS
================================ */
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid ID");
  }
  return value;
});

/* ===============================
   PROFILE UPDATE
================================ */

exports.profileUpdateSchema = Joi.object({
  profile: Joi.object({
    nickname: Joi.string().min(2).max(30),
    dob: Joi.date().iso(),
    gender: Joi.string().valid("man", "woman", "other"),
    height: Joi.number().min(100).max(250),
    about: Joi.string().max(500),
    jobTitle: Joi.string().max(50),
    company: Joi.string().max(50),
    school: Joi.string().max(50),
    pronouns: Joi.string(),
    weight: Joi.number().min(30).max(300)
  }).required()
});

/* ===============================
   LOCATION
================================ */

exports.locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

/* ===============================
   USER ID PARAM
================================ */
exports.userIdParamSchema = Joi.object({
  userId: objectId.required()
});