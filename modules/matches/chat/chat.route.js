// routes/messages.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// GET messages /api/v1/messages/:matchId

router.get("/:matchId");

// PATCH mark messages read or seen
// PATCH /api/v1/messages/:matchId/read
router.patch("/:matchId/read");

module.exports = router;
