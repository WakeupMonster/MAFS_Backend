// routes/messages.js
const express = require("express");
const {
  getChatMessages,
  updateChatMsgRead,
  deleteChatMessage,
  sendMessage,
  getChatList
  // uploadChatMediaController,
  // deleteAllChatMessagesForUser,
} = require("./chat.controller");
const router = express.Router();

// Middleware: ensure user is logged in (optional depending on your project)
const auth = require("../../auth/auth.middleware");
// const {
//   uploadMedia,
//   handleMulterError,
// } = require("../../upload/upload.middleware");

router.use(auth);

router.get("/messages", getChatMessages);
router.get("/list",getChatList)
router.post("/send",sendMessage)
router.patch("/messages/:matchId/read", updateChatMsgRead);
router.delete("/messages/:matchId/:mesId", deleteChatMessage);
module.exports = router;

// DELETE all message by matchId /api/v1/chat/messages/:matchId
// router.delete("/messages/:matchId", deleteAllChatMessagesForUser);

// POST chat upload-media /api/v1/chat/upload-media
// router.post(
//   "/upload-media",
//   uploadMedia,
//   handleMulterError,
//   uploadChatMediaController
// );


