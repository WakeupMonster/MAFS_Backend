const router = require("express").Router();
const controller = require("./support.controller");
const authMiddleware = require("../../auth/auth.middleware");
const { upload } = require("../../upload/upload.middleware");
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");

router.post("/", authMiddleware, apiLimiter("support_create", 3, 3600), controller.contactSupport);
router.get("/alltickets", authMiddleware, apiLimiter("support_list", 20, 60), controller.getAllTickets);
router.get("/ticket/:ticketId", authMiddleware, apiLimiter("support_view", 20, 60), controller.getMyTicketById);
router.post(
  "/adminreply",
  authMiddleware,
  apiLimiter("support_reply", 10, 60),
  upload.array("attachments", 5),
  controller.replyToTicket
);
router.get("/my-ticket", authMiddleware, apiLimiter("support_my_tickets", 20, 60), controller.myTicket);
router.delete("/ticket/:ticketId", authMiddleware, apiLimiter("support_delete", 5, 3600), controller.deleteTicket);

module.exports = router;
