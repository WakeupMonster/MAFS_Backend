const router = require("express").Router();
const controller = require("./support.controller");
const authMiddleware = require("../../auth/auth.middleware");
const { upload } = require("../../upload/upload.middleware");
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");
const rateLimit = require("express-rate-limit");

const createTicketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // start blocking after 3 requests
  keyGenerator: (req) => req.user ? req.user._id.toString() : (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
  message: {
    success: false,
    message: "Too many support requests, please try again after an hour."
  }
});

router.post("/", authMiddleware, createTicketLimiter, controller.contactSupport);
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
