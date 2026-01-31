const router = require("express").Router();
const controller = require("./support.controller");
const authMiddleware = require("../../auth/auth.middleware");

router.post("/", authMiddleware, controller.contactSupport);
router.get("/alltickets", authMiddleware, controller.getAllTickets);
router.get("/ticket/:ticketId", authMiddleware, controller.getMyTicketById);
router.post("/adminreply",authMiddleware,controller.replyToTicket)
router.get("/my-ticket",authMiddleware,controller.myTicket)

module.exports = router;