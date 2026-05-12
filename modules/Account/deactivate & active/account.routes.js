const express = require("express");
const router = express.Router();
const auth = require("../../auth/auth.middleware");
const controller = require("./account.controller");
const { rateLimit } = require("./rateLimit.middleware");
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");

router.use(auth);

// Deactivate account
router.post("/deactivate", rateLimit("deactivate", 2, 60 * 60 * 24), controller.deactivateAccount);

// Reactivate account
router.post("/reactivate", rateLimit("deactivate", 2, 60 * 60 * 24), controller.reactivateAccount);

router.delete(
  "/delete",
  auth,
  apiLimiter("account_delete", 2, 86400),
  controller.deleteAccount
);
// router.post("/delete/request-otp", auth, controller.requestDeleteAccountOtp)

router.post("/delete/restore", auth, apiLimiter("account_restore", 2, 86400), controller.restoreAccount);

router.post(
  "/found-the-right-one",
  auth,
  apiLimiter("mark_married", 2, 86400),
  controller.markAsMarried
);
module.exports = router;