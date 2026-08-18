const express = require("express");
const router = express.Router();
const auth = require("../../auth/auth.middleware");
const controller = require("./account.controller");
const { rateLimit } = require("./rateLimit.middleware");
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");

router.use(auth);

// Deactivate account
router.post("/deactivate", rateLimit("deactivate", 5, 3600), controller.deactivateAccount); // 5 req / 1 hour

// Reactivate account
router.post("/reactivate", rateLimit("reactivate", 5, 3600), controller.reactivateAccount); // 5 req / 1 hour

router.delete(
  "/delete",
  auth,
  apiLimiter("account_delete", 5, 3600), // 5 req / 1 hour
  controller.deleteAccount
);
// router.post("/delete/request-otp", auth, controller.requestDeleteAccountOtp)

router.post("/delete/restore", auth, apiLimiter("account_restore", 5, 3600), controller.restoreAccount); // 5 req / 1 hour

router.post(
  "/found-the-right-one",
  auth,
  apiLimiter("mark_married", 2, 86400),
  controller.markAsMarried
);
module.exports = router;