const {
  profileUpdateSchema,
  // locationSchema,
  userIdParamSchema
} = require("./profile.schema");

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: true,
      stripUnknown: true
    });

    if (error) {
      const detail = error.details[0];
      return res.status(400).json({
        success: false,
         message: detail.context?.label
    ? `${detail.context.label} is invalid`
    : "Invalid request data"
      });
    }

    req[property] = value;
    next();
  };
};

module.exports.validateProfileUpdate = validate(profileUpdateSchema);
// module.exports.validateLocation = validate(locationSchema);
module.exports.validateUserIdParam = validate(userIdParamSchema, "params");