// routes/messages.js
const express = require("express");
const {
  getChatMessages,
  updateChatMsgRead,
  deleteChatMessage,
  sendMessage,
  getChatList,
  uploadChatMediaController,
  deleteChatMessageWithMedia,
} = require("./chat.controller");

const router = express.Router();
const auth = require("../../auth/auth.middleware");

// 🔥 NEW: Chat-specific upload middleware (dedicated, production-ready)
const {
  uploadChatMedia,
  handleChatUploadError,
  validateChatUpload,
} = require("./chat.upload.middleware");

router.use(auth);

// ─── Chat Routes ───
router.get("/messages/:matchId", getChatMessages);
router.get("/list", getChatList);
router.post("/send", sendMessage);
router.patch("/messages/:matchId/read", updateChatMsgRead);
router.delete("/messages/:matchId/:mesId", deleteChatMessage);

// ─── Chat Media Upload (NEW dedicated middleware) ───
router.post(
  "/upload-media",
  (req, res, next) => {
    uploadChatMedia(req, res, (err) => {
      if (err) {
        return handleChatUploadError(err, req, res, next);
      }
      next();
    });
  },
  validateChatUpload,          // Per-type size validation (image vs video vs gif)
  uploadChatMediaController
);

// ─── Delete Message with Media ───
router.delete("/messages/:messageId", deleteChatMessageWithMedia);

module.exports = router;