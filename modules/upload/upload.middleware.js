// modules/upload/upload.middleware.js
const multer = require("multer");
// eslint-disable-next-line no-unused-vars
const path = require("path");

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, WebP, SVG and GIF are allowed."),
      false
    );
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 6, // Max 6 files
  },
  fileFilter: fileFilter,
});

// Create a middleware function that uses upload.array()
const uploadPhotos = upload.array("photos", 6);

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Max size is 5MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Maximum 6 photo allowed.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field. Use 'photos' & max 6 files.",
      });
    }
    if (
      err.message === "Invalid file type. Only JPEG, PNG, and WebP are allowed."
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "Error uploading file",
    });
  }
  next();
};

const uploadSingle = (field) => upload.single(field);

const uploadFields = upload.fields([
  { name: "front", maxCount: 1 },
  { name: "back", maxCount: 1 },
]);

const uploadFWB = upload.fields([
  { name: "com_logo", maxCount: 1 },
  { name: "prod_img", maxCount: 1 },
]);

// 🔥 CHAT MEDIA (single + multiple)
const uploadChatMedia = upload.array("media", 10);

module.exports = {
  upload,
  uploadPhotos, // This is the pre-configured middleware
  handleMulterError,
  uploadSingle,
  uploadFields,
  uploadFWB,
  // uploadMedia,
  uploadChatMedia,
};
