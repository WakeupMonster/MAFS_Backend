// routes/messages.js
const express = require("express");
const { getChatMessages, updateChatMsgRead, deleteChatMessage } = require("./chat.controller");
const router = express.Router();

// Middleware: ensure user is logged in (optional depending on your project)
const auth = require("../../auth/auth.middleware");

router.use(auth);

// GET messages /api/v1/messages/:matchId?limit=20&page=1
router.get("/messages", getChatMessages);

// PATCH mark messages read or seen /api/v1/messages/:matchId/read
router.patch("/messages/:matchId/read", updateChatMsgRead);

router.delete("/messages/:matchId/:messageId", deleteChatMessage);

module.exports = router;