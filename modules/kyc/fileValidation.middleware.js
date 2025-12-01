// // middlewares/fileValidation.middleware.js

// const { validationResult } = require('express-validator');

// const validateFiles = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ 
//       success: false,
//       errors: errors.array() 
//     });
//   }
  
//   const files = req.files;
//   const maxSize = 5 * 1024 * 1024; // 5MB
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
//   // Check if files exist
//   if (!files || !files.selfie || !files.idVerification) {
//     return res.status(400).json({
//       success: false,
//       message: 'Both selfie and ID verification images are required'
//     });
//   }

//   const { selfie, idVerification } = files;
  
//   // Validate selfie
//   if (selfie[0].size > maxSize) {
//     return res.status(400).json({
//       success: false,
//       message: 'Selfie image is too large. Max size is 5MB'
//     });
//   }
  
//   if (!allowedTypes.includes(selfie[0].mimetype)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid file type for selfie. Only JPG, JPEG, and PNG are allowed'
//     });
//   }
  
//   // Validate ID verification
//   if (idVerification[0].size > maxSize) {
//     return res.status(400).json({
//       success: false,
//       message: 'ID verification image is too large. Max size is 5MB'
//     });
//   }
  
//   if (!allowedTypes.includes(idVerification[0].mimetype)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid file type for ID verification. Only JPG, JPEG, and PNG are allowed'
//     });
//   }
  
//   next();
// };

// module.exports = validateFiles;