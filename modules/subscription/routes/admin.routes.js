const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { allowAdmin } = require("../../../common/middlewares/allowAdmin.middleware");
const protect = require("../../auth/auth.middleware");

// All routes here are protected and require ADMIN role
router.use(protect);
router.use(allowAdmin);

/**
 * --- Configuration ---
 */
router.get("/config", adminController.getConfig);
router.patch("/config", adminController.updateConfig);
router.put("/config", adminController.updateConfig);

/**
 * --- Product Catalog ---
 */
router.get("/products", adminController.listProducts);
router.post("/products", adminController.createProduct);
router.patch("/products/:productKey", adminController.updateProduct);
router.put("/products/:productKey", adminController.updateProduct);

/**
 * --- Subscriber Management ---
 */
router.get("/subscribers", adminController.listSubscribers);
router.get("/users/:userId", adminController.getUserSubscriptionDetail);
router.post("/users/:userId/grant", adminController.manualGrant);
router.post("/users/:userId/grant-consumable", adminController.grantConsumables);
router.post("/users/:userId/revoke", adminController.revokeSubscription);

/**
 * --- Analytics ---
 */
router.get("/dashboard", adminController.getDashboardStats);

module.exports = router;
