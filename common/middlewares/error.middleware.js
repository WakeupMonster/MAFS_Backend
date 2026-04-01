// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res,next) => {


   // File too large
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      code: "FILE_TOO_LARGE",
      message: "File too large. Max size is 5MB."
    });
  }

  // Too many files OR wrong field name
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      code: "INVALID_FILE_FIELD",
      message: "Only 6 files allowed and field name must be 'photos'."
    });
  }

  // Invalid file type (fileFilter error)
  if (err.message?.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      code: "INVALID_FILE_TYPE",
      message: err.message
    });
  }


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
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong. Please try again.",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};