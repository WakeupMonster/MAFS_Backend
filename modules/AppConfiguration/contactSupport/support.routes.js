const router = require("express").Router();
const controller = require("./support.controller");
const authMiddleware = require("../../auth/auth.middleware");
const { upload } = require("../../upload/upload.middleware");

router.post("/", authMiddleware, controller.contactSupport);
router.get("/alltickets", authMiddleware, controller.getAllTickets);
router.get("/ticket/:ticketId", authMiddleware, controller.getMyTicketById);
router.post("/adminreply", authMiddleware, upload.array("attachments", 5), controller.replyToTicket);
router.get("/my-ticket", authMiddleware, controller.myTicket);
router.delete("/ticket/:ticketId", authMiddleware, controller.deleteTicket);

module.exports = router;
