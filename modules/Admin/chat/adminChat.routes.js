const express = require("express");
const router = express.Router();

const {
  getReportedChats,
  getChatMessagesForReview,
  takeChatAction,
  getChatActionHistory
} = require("./adminChat.controller");

const adminAuth = require("../../../modules/auth/auth.middleware");

router.use(adminAuth);

/**
 * GET all reported chats (queue)
 */
router.get("/reported", getReportedChats);

/**
 * GET messages of a chat (READ ONLY)
 */
router.get("/:matchId/messages", getChatMessagesForReview);

/**
 * TAKE ACTION on chat/messages/users
 */
router.post("/:matchId/action", takeChatAction);

/**
 * Audit history
 */
router.get("/:matchId/history", getChatActionHistory);

module.exports = router;