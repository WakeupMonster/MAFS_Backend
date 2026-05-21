// const express = require("express");
// const router = express.Router();

// const auth = require("../../auth/auth.middleware");

// router.use(auth);

// router.get("/feed", validation.feed, controller.getFeed);
// router.post("/action", validation.action, controller.action);
// router.post("/undo", validation.undo, controller.undo);
// router.get("/matches", controller.getMatches);
// module.exports = router;

const controllerOld = require("./swipe.controller");
const validation = require("./swipe.validation");

const express = require("express");
const router = express.Router();

// Middleware: ensure user is logged in (optional depending on your project)
const auth = require("../../auth/auth.middleware");

const {
  allowDating,
} = require("../../../common/middlewares/allowDating.middleware");
const { apiLimiter } = require("../../../common/middlewares/apiLimiter");

router.use(auth);
router.use(allowDating);
// router.get("/feed", apiLimiter("swipe_feed", 30, 60), validation.feed, controllerOld.getFeed);
// router.post("/action", apiLimiter("swipe_action", 40, 60), controllerOld.action);
// router.post("/unmatch", apiLimiter("unmatch", 5, 3600), controllerOld.unmatchUser);
// router.get("/matches", apiLimiter("get_matches", 30, 60), controllerOld.getMatches);
// router.post("/undo", apiLimiter("swipe_undo", 5, 60), validation.undo, controllerOld.undo);


router.get("/feed", validation.feed, controllerOld.getFeed);
router.post("/action", controllerOld.action);
router.post("/unmatch", controllerOld.unmatchUser);
router.get("/matches", controllerOld.getMatches);
router.post("/undo", validation.undo, controllerOld.undo);




// CREATE block or report
// router.post("/action", controller.action);

// GET all blocked users
// router.get("/blocked", controller.getBlockedUsers);

// // GET all reported users
// router.get("/reported", controller.getReportedUsers);

// UNBLOCK user
// router.delete("/", controller.unblockUser);

// router.get("/limits", controller.getLimits);

// router.get("/keen", apiLimiter("get_keen", 20, 60), controllerOld.getKeen);
// router.get("/superkeen", apiLimiter("get_superkeen", 20, 60), controllerOld.getSuperKeen);

router.get("/keen", controllerOld.getKeen);
router.get("/superkeen", controllerOld.getSuperKeen);


module.exports = router;
