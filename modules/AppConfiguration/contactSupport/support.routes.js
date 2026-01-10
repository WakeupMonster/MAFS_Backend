const router = require("express").Router();
const controller = require("./support.controller");
const authMiddleware = require("../../auth/auth.middleware");

router.post("/", authMiddleware, controller.contactSupport);
router.get("/my-tickets", authMiddleware, controller.getMyTickets);
router.get("/ticket/:ticketId", authMiddleware, controller.getMyTicketById);
router.post("/adminreply",authMiddleware,controller.replyToTicket)

module.exports = router;