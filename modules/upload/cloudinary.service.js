// modules/upload/cloudinary.service.js
const cloudinary = require('cloudinary').v2;
// const { promisify } = require('util');
const stream = require('stream');
const config = require('../../config/cloudinaryConfig');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const theTransformStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'dating-app',
        ...options 
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(theTransformStream);
  });
};

const destroy = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  uploadStream,
  destroy
};