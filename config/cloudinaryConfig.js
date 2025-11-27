// config/index.js
require('dotenv').config();

module.exports = {
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Other configs...
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000
};