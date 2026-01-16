const Joi = require("joi");
const mongoose = require("mongoose");

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid ID");
  }
  return value;
});

const stringArray = (label) =>
  Joi.array()
    .items(Joi.string().trim())
    .label(label);

const attributesSchema = Joi.object({
  // Basics
  zodiac: Joi.string().label("Zodiac"),
  education: Joi.string().label("Education"),
  familyPlans: Joi.string().label("Family Plans"),
  personalityType: Joi.string().label("Personality Type"),
  communicationStyle: Joi.string().label("Communication Style"),
  loveStyle: Joi.string().label("Love Style"),
  bloodType: Joi.string().label("Blood Type"),
  covidVaccine: Joi.string().label("Covid Vaccine"),
  religion: Joi.string().label("Religion"),

  // Lifestyle
  pets: Joi.string().label("Pets"),
  drinking: Joi.string().label("Drinking"),
  smoking: Joi.string().label("Smoking"),
  workout: Joi.string().label("Workout"),
  dietary: Joi.string().label("Dietary Preference"),
  sleeping: Joi.string().label("Sleeping Habits"),
  socialMedia: Joi.string().label("Social Media Usage"),

  // Arrays
  languages: stringArray("Languages"),
  interests: stringArray("Interests").min(1),
  music: stringArray("Music"),
  movies: stringArray("Movies"),
  books: stringArray("Books"),
  travel: stringArray("Travel")
})
  .label("Attributes")
  .min(1);

const genderEnum = [
  "man",
  "woman",
  "non-binary",
  "trans-man",
  "trans-woman",
  "genderqueer",
  "everyone"
];

const discoverySchema = Joi.object({
  distanceRange: Joi.number()
    .min(1)
    .max(500)
    .label("Distance Range"),

  ageRange: Joi.object({
    min: Joi.number().min(18).max(99).label("Minimum Age"),
    max: Joi.number().min(18).max(99).label("Maximum Age")
  })
    .custom((value, helpers) => {
      if (value.min > value.max) {
        return helpers.message("Age range is invalid");
      }
      return value;
    })
    .label("Age Range"),

  showMeGender: Joi.array()
    .items(Joi.string().valid(...genderEnum))
    .label("Gender Preference"),

  relationshipGoal: Joi.string().label("Relationship Goal"),

  globalVisibility: Joi.string()
    .valid("everyone", "matches_only", "nobody")
    .label("Profile Visibility"),

  filterRelationshipGoal: Joi.string().label("Filter Relationship Goal"),

  preferredInterests: Joi.array()
    .items(Joi.string())
    .label("Preferred Interests"),

  advancedFilters: Joi.object({
    zodiac: Joi.array().items(Joi.string()).label("Zodiac Filter"),
    education: Joi.array().items(Joi.string()).label("Education Filter"),
    familyPlans: Joi.string().label("Family Plans Filter"),
    personalityType: Joi.string().label("Personality Type Filter"),
    communicationStyle: Joi.string().label("Communication Style Filter"),
    loveStyle: Joi.string().label("Love Style Filter"),
    pets: Joi.string().label("Pets Filter"),
    drinking: Joi.string().label("Drinking Filter"),
    smoking: Joi.string().label("Smoking Filter"),
    workout: Joi.string().label("Workout Filter"),
    dietary: Joi.string().label("Dietary Filter"),
    socialMedia: Joi.string().label("Social Media Filter"),
    sleeping: Joi.string().label("Sleeping Filter")
  }).label("Advanced Filters")
})
  .label("Discovery Preferences")
  .min(1);

exports.profileUpdateSchema = Joi.object({
  profile: Joi.object({
    nickname: Joi.string().min(2).max(30).label("Nickname"),
    dob: Joi.date().iso().label("Date of Birth"),
    gender: Joi.string().valid("man", "woman", "non-binary","trans-man","trans-woman","genderqueer","everyone").label("Gender"),
    height: Joi.number().min(100).max(250).label("Height"),
    about: Joi.string().max(500).label("About"),
    jobTitle: Joi.string().max(50).label("Job Title"),
    company: Joi.string().max(50).label("Company"),
    school: Joi.string().max(50).label("School"),
    pronouns: Joi.string().label("Pronouns"),
    weight: Joi.number().min(30).max(300).label("Weight")
  }).required(),
  attributes: attributesSchema,
   discovery: discoverySchema
});

exports.locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required() .label("Latitude")
    .messages({
      "any.required": "Latitude is required",
      "number.base": "Latitude must be a number",
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90"
    }),
  longitude: Joi.number().min(-180).max(180).required() .label("Longitude")
    .messages({
      "any.required": "Longitude is required",
      "number.base": "Longitude must be a number",
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180"
    }),

  city: Joi.string().allow("", null).label("City"),
  state: Joi.string().allow("", null).label("State"),
  country: Joi.string().allow("", null).label("Country"),
  full_address: Joi.string().allow("", null).label("Full Address")
});

exports.userIdParamSchema = Joi.object({
  userId: objectId.required()
});


