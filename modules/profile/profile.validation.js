const {
  profileUpdateSchema,
  locationSchema,
  userIdParamSchema
} = require("./profile.schema");

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: true,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    req[property] = value;
    next();
  };
};

exports.validateProfileUpdate = validate(profileUpdateSchema);
exports.validateLocation = validate(locationSchema);
exports.validateUserIdParam = validate(userIdParamSchema, "params");