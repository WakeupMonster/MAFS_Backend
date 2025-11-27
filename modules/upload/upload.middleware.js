// // // modules/upload/upload.middleware.js
// // const multer = require('multer');
// // const multerMemory = multer({ 
// //   storage: multer.memoryStorage(),
// //   limits: {
// //     fileSize: 5 * 1024 * 1024, // 5MB limit
// //     files: 6 // Max 6 files
// //   },
// //   fileFilter: (req, file, cb) => {
// //     const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
// //     if (!allowedTypes.includes(file.mimetype)) {
// //       const error = new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
// //       error.code = 'LIMIT_FILE_TYPES';
// //       return cb(error, false);
// //     }
// //     cb(null, true);
// //   }
// // });

// // const handleMulterError = (err, req, res, next) => {
// //   if (err.code === 'LIMIT_FILE_SIZE') {
// //     return res.status(400).json({
// //       success: false,
// //       message: 'File too large. Max size is 5MB.'
// //     });
// //   }
// //   if (err.code === 'LIMIT_FILE_TYPES') {
// //     return res.status(400).json({
// //       success: false,
// //       message: err.message
// //     });
// //   }
// //   if (err.code === 'LIMIT_UNEXPECTED_FILE') {
// //     return res.status(400).json({
// //       success: false,
// //       message: 'Maximum 6 photos allowed.'
// //     });
// //   }
// //   next(err);
// // };

// // module.exports = {
// //   upload: multerMemory,
// //   handleMulterError
// // };


// // modules/upload/upload.middleware.js
// const multer = require('multer');

// // Configure multer to use memory storage
// const storage = multer.memoryStorage();

// // File filter to allow only images
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
//   }
// };

// // Create multer instance with configuration
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//     files: 6 // Max 6 files
//   },
//   fileFilter: fileFilter
// });

// // Middleware to handle multer errors
// const handleMulterError = (err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     // A Multer error occurred when uploading
//     if (err.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({
//         success: false,
//         message: 'File too large. Max size is 5MB.'
//       });
//     }
//     if (err.code === 'LIMIT_FILE_COUNT') {
//       return res.status(400).json({
//         success: false,
//         message: 'Maximum 6 photos allowed.'
//       });
//     }
//   } else if (err) {
//     // An unknown error occurred
//     return res.status(400).json({
//       success: false,
//       message: err.message || 'Error uploading file'
//     });
//   }
//   // If no error, proceed to next middleware
//   next();
// };

// module.exports = {
//   upload,
//   handleMulterError
// };


// modules/upload/upload.middleware.js
const multer = require('multer');
// eslint-disable-next-line no-unused-vars
const path = require('path');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 6 // Max 6 files
  },
  fileFilter: fileFilter
});

// Create a middleware function that uses upload.array()
const uploadPhotos = upload.array('photos', 6);

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Max size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Maximum 6 photos allowed.'
      });
    }
    if (err.message === 'Invalid file type. Only JPEG, PNG, and WebP are allowed.') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Error uploading file'
    });
  }
  next();
};

module.exports = {
  uploadPhotos,  // This is the pre-configured middleware
  handleMulterError
};