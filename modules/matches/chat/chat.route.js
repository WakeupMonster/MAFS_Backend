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
  // deleteAllChatMessagesForUser,
} = require("./chat.controller");
const router = express.Router();
const uploadMiddleware = require("../../upload/upload.middleware");

const auth = require("../../auth/auth.middleware");

router.use(auth);

router.get("/messages/:matchId", getChatMessages);
router.get("/list", getChatList);
router.post("/send", sendMessage);
router.patch("/messages/:matchId/read", updateChatMsgRead);
router.delete("/messages/:matchId/:mesId", deleteChatMessage);
module.exports = router;

router.post(
  "/upload-media",
  (req, res, next) => {
    uploadMiddleware.uploadChatMedia(req, res, (err) => {
      if (err) {
        return uploadMiddleware.handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadChatMediaController
);

// routes/messages.js
router.delete("/messages/:messageId", deleteChatMessageWithMedia);
