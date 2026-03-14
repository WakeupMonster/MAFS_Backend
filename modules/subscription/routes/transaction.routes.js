const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");
const protect = require("../../auth/auth.middleware");

// All routes here are protected and require ADMIN role
router.use(protect);
router.use(allowAdmin);

/**
 * --- Transaction List ---
 * GET /api/v1/admin/transactions
 * Query Params: eventType, platform, productId, status, page, limit, startDate, endDate, sortBy, sortOrder
 */
router.get("/", transactionController.getTransactions);

/**
 * --- Revenue Summary Cards ---
 * GET /api/v1/admin/transactions/summary
 * Query Params: startDate, endDate (optional date range filter)
 */
router.get("/summary", transactionController.getTransactionSummary);

/**
 * --- Export CSV ---
 * GET /api/v1/admin/transactions/export
 * Query Params: startDate, endDate, eventType, platform (optional filters)
 */
router.get("/export", transactionController.exportTransactionsCSV);

module.exports = router;
