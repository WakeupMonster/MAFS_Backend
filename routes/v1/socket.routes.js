const express = require('express');
const router = express.Router();

// Test Socket.IO route
router.get('/test-socket', (req, res) => {
  const io = req.app.get('io');
  io.emit('test', { message: 'This is a test broadcast message' });
  res.json({ success: true, message: 'Test message sent to all connected clients' });
});

module.exports = router;