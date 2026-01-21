// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res,next) => {
  if (err.code && err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message
    });
  }

  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: err.details[0].message
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      code: "DUPLICATE_VALUE",
      message: "Value already exists"
    });
  }

  console.error("UNHANDLED ERROR:", err);

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong. Please try again."
  });
};