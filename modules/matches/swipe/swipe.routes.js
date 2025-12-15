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
const controller = require("./BlockReport/userActions.controller");

// Middleware: ensure user is logged in (optional depending on your project)
const auth = require("../../auth/auth.middleware");

router.use(auth);

router.get("/feed", validation.feed, controllerOld.getFeed);
router.post("/action", validation.action, controllerOld.action);
router.post("/undo", validation.undo, controllerOld.undo);
router.get("/matches", controllerOld.getMatches);

// CREATE block or report
router.post("/", controller.createAction);

// GET all blocked users
router.get("/blocked", controller.getBlockedUsers);

// GET all reported users
router.get("/reported", controller.getReportedUsers);

// UNBLOCK user
router.delete("/", controller.unblockUser);

router.get("/limits", controllerOld.getLimits);

router.get("/keen", controllerOld.getKeen);
router.get("/superkeen", controllerOld.getSuperKeen);


router.get(
  '/discover',
  auth,
  controllerOld.getProfiles
);


module.exports = router;