// module.exports = schema => (req, res, next) => {
//   const validationTargets = ["body", "params", "query"];
//   const errors = [];

//   for (const key of validationTargets) {
//     if (schema[key]) {
//       const { error } = schema[key].validate(req[key], {
//         abortEarly: false,
//         stripUnknown: true
//       });

//       if (error) {
//         errors.push(...error.details.map(d => d.message));
//       }
//     }
//   }

//   if (errors.length) {
//     return res.status(400).json({
//       success: false,
//       message: "Validation failed",
//       errors
//     });
//   }
//   next();
// };


module.exports = schema => (req, res, next) => {
  const errors = [];

  ["body", "params", "query"].forEach(key => {
    if (schema[key]) {
      const { error, value } = schema[key].validate(req[key], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        error.details.forEach(d => errors.push(d.message));
      } else {
        req[key] = value; // sanitized input
      }
    }
  });

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};
