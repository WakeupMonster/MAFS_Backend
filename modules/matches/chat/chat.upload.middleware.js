/**
 * 🔥 CHAT-SPECIFIC UPLOAD MIDDLEWARE
 *
 * Profile upload middleware se ALAG kyunki:
 * 1. Chat mein video bhi aa sakta hai (profile mein sirf photo)
 * 2. Chat mein zyada files ek saath aa sakti hain
 * 3. Size limits alag hain (video ke liye zyada chahiye)
 * 4. Error messages chat-specific hone chahiye
 *
 * iPhone Notes:
 * - iPhone photo (HEIC) ≈ 2-5 MB, converted to JPEG ≈ 3-8 MB
 * - iPhone video (1080p) ≈ 10-15 MB per 10 seconds
 * - iPhone video (4K) ≈ 40-50 MB per 10 seconds
 *
 * Cloudinary Free Tier:
 * - Max image upload: 10 MB
 * - Max video upload: 100 MB
 * - 25 credits/month (1 credit = 1 GB storage OR 1 GB bandwidth)
 * - Strategy: Compress on Cloudinary side using quality:auto
 */

const multer = require("multer");

/* ──────────────────────────────────────────────
   📏 LIMITS CONFIGURATION
   ────────────────────────────────────────────── */

const CHAT_UPLOAD_LIMITS = {
  // Per-file size limits (bytes)
  IMAGE_MAX_SIZE: 10 * 1024 * 1024,  // 10 MB — Cloudinary free max for images
  VIDEO_MAX_SIZE: 25 * 1024 * 1024,  // 25 MB — enough for ~15-20 sec iPhone 1080p
  GIF_MAX_SIZE: 8 * 1024 * 1024,     // 8 MB — GIFs are heavy

  // File count limits
  MAX_FILES_PER_MESSAGE: 5,          // Max 5 files in one message

  // Multer needs a single fileSize — we use the highest (video)
  // and do per-type validation manually in fileFilter
  MULTER_MAX_FILE_SIZE: 25 * 1024 * 1024,  // 25 MB (video max)
};

/* ──────────────────────────────────────────────
   📋 ALLOWED MIME TYPES
   ────────────────────────────────────────────── */

const ALLOWED_TYPES = {
  image: [
    "image/jpeg",      // .jpg, .jpeg
    "image/png",       // .png
    "image/webp",      // .webp
    "image/heic",      // iPhone default photo format
    "image/heif",      // iPhone alternate
  ],
  gif: [
    "image/gif",       // .gif
  ],
  video: [
    "video/mp4",       // .mp4
    "video/quicktime", // .mov (iPhone default video format)
    "video/webm",      // .webm
  ],
};

// Flat list for multer fileFilter
const ALL_ALLOWED_MIMES = [
  ...ALLOWED_TYPES.image,
  ...ALLOWED_TYPES.gif,
  ...ALLOWED_TYPES.video,
];

/* ──────────────────────────────────────────────
   🔍 HELPER: Get file category from mime type
   ────────────────────────────────────────────── */

function getFileCategory(mimetype) {
  if (ALLOWED_TYPES.image.includes(mimetype)) return "image";
  if (ALLOWED_TYPES.gif.includes(mimetype)) return "gif";
  if (ALLOWED_TYPES.video.includes(mimetype)) return "video";
  return null;
}

/* ──────────────────────────────────────────────
   🔒 FILE FILTER — Type + Per-Type Size Validation
   ────────────────────────────────────────────── */

const chatFileFilter = (req, file, cb) => {
  // 1. Check mime type
  if (!ALL_ALLOWED_MIMES.includes(file.mimetype)) {
    const error = new Error(
      `Unsupported file type: ${file.mimetype}. ` +
      `Allowed: JPEG, PNG, WebP, HEIC, GIF, MP4, MOV, WebM.`
    );
    error.code = "CHAT_INVALID_TYPE";
    return cb(error, false);
  }

  // Multer accepts the file — per-type size check happens in
  // validateChatUpload middleware (after multer parses all files)
  cb(null, true);
};

/* ──────────────────────────────────────────────
   ⚙️ MULTER INSTANCE — Chat Specific
   ────────────────────────────────────────────── */

const chatMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CHAT_UPLOAD_LIMITS.MULTER_MAX_FILE_SIZE,
    files: CHAT_UPLOAD_LIMITS.MAX_FILES_PER_MESSAGE,
  },
  fileFilter: chatFileFilter,
});

// The actual middleware that processes "media" field
const uploadChatMedia = chatMulter.array(
  "media",
  CHAT_UPLOAD_LIMITS.MAX_FILES_PER_MESSAGE
);

/* ──────────────────────────────────────────────
   ❌ ERROR HANDLER — Chat-Specific Error Messages
   ────────────────────────────────────────────── */

const handleChatUploadError = (err, req, res, next) => {
  if (!err) return next();

  // Multer built-in errors
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          errorCode: "FILE_TOO_LARGE",
          message: `File too large. Max size: Images 10 MB, Videos 25 MB, GIFs 8 MB.`,
          limits: {
            image: `${CHAT_UPLOAD_LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)} MB`,
            video: `${CHAT_UPLOAD_LIMITS.VIDEO_MAX_SIZE / (1024 * 1024)} MB`,
            gif: `${CHAT_UPLOAD_LIMITS.GIF_MAX_SIZE / (1024 * 1024)} MB`,
          },
        });

      case "LIMIT_FILE_COUNT":
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          errorCode: "TOO_MANY_FILES",
          message: `Maximum ${CHAT_UPLOAD_LIMITS.MAX_FILES_PER_MESSAGE} files per message allowed.`,
          maxFiles: CHAT_UPLOAD_LIMITS.MAX_FILES_PER_MESSAGE,
        });

      default:
        return res.status(400).json({
          success: false,
          errorCode: "UPLOAD_ERROR",
          message: err.message || "Upload failed",
        });
    }
  }

  // Custom errors (from fileFilter)
  if (err.code === "CHAT_INVALID_TYPE") {
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_FILE_TYPE",
      message: err.message,
      allowedTypes: {
        images: ["JPEG", "PNG", "WebP", "HEIC"],
        gifs: ["GIF"],
        videos: ["MP4", "MOV", "WebM"],
      },
    });
  }

  // Custom errors (from validateChatUpload)
  if (err.code === "CHAT_FILE_SIZE_EXCEEDED") {
    return res.status(400).json({
      success: false,
      errorCode: "FILE_TOO_LARGE",
      message: err.message,
      limits: {
        image: `${CHAT_UPLOAD_LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)} MB`,
        video: `${CHAT_UPLOAD_LIMITS.VIDEO_MAX_SIZE / (1024 * 1024)} MB`,
        gif: `${CHAT_UPLOAD_LIMITS.GIF_MAX_SIZE / (1024 * 1024)} MB`,
      },
    });
  }

  // Unknown error
  return res.status(400).json({
    success: false,
    errorCode: "UPLOAD_ERROR",
    message: err.message || "Failed to upload chat media",
  });
};

/* ──────────────────────────────────────────────
   ✅ POST-UPLOAD VALIDATION
   Per-type size check (after multer has parsed files)

   Kyun separate?
   Multer ka fileSize ek hi value le sakta hai (25 MB — video max).
   Lekin image 10 MB se zyada nahi honi chahiye.
   Toh multer ke baad manually check karte hain.
   ────────────────────────────────────────────── */

const validateChatUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      errorCode: "NO_FILES",
      message: "No media files uploaded.",
    });
  }

  // Per-type size validation
  for (const file of req.files) {
    const category = getFileCategory(file.mimetype);
    let maxSize;

    switch (category) {
      case "image":
        maxSize = CHAT_UPLOAD_LIMITS.IMAGE_MAX_SIZE;
        break;
      case "gif":
        maxSize = CHAT_UPLOAD_LIMITS.GIF_MAX_SIZE;
        break;
      case "video":
        maxSize = CHAT_UPLOAD_LIMITS.VIDEO_MAX_SIZE;
        break;
      default:
        maxSize = CHAT_UPLOAD_LIMITS.IMAGE_MAX_SIZE;
    }

    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      const fileMB = (file.size / (1024 * 1024)).toFixed(1);
      const error = new Error(
        `${category.toUpperCase()} file "${file.originalname}" is ${fileMB} MB. ` +
        `Max allowed for ${category}: ${maxMB} MB.`
      );
      error.code = "CHAT_FILE_SIZE_EXCEEDED";
      return next(error);
    }
  }

  // Attach file categories to req for controller use
  req.fileCategories = req.files.map((file) => ({
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    category: getFileCategory(file.mimetype),
  }));

  next();
};

/* ──────────────────────────────────────────────
   📤 EXPORTS
   ────────────────────────────────────────────── */

module.exports = {
  uploadChatMedia,
  handleChatUploadError,
  validateChatUpload,
  CHAT_UPLOAD_LIMITS,
  getFileCategory,
};
