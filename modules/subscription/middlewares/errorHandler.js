// ❌ ABHI: Har controller mein try-catch hai
// But global error handler nahi hai

// ✅ PRODUCTION MEIN:
// middlewares/errorHandler.js

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString(),
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: "Duplicate entry",
    });
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }

  // Known operational error
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Unknown error - don't leak details
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
};

module.exports = { AppError, errorHandler };

// app.js mein
// eslint-disable-next-line no-undef
app.use(errorHandler); // LAST middleware