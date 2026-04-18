const express = require('express');
const router = express.Router();
const { uploadSingle } = require('./upload.middleware');
const cloudinaryService = require('./cloudinary.service');

router.post('/image', uploadSingle('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const result = await cloudinaryService.uploadStream(req.file.buffer, {
      folder: 'mafs-admin-icons',
      resource_type: 'image'
    });
    
    return res.json({ success: true, url: result.secure_url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
