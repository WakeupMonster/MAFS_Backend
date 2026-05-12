const express = require("express");
const router = express.Router();

const auth = require("../auth/auth.middleware");
const validate = require("../../common/middlewares/validate");
const { apiLimiter } = require("../../common/middlewares/apiLimiter");

// const {importContacts,blockContacts,getBlockedContacts,unblockContact} = require("./contacts.controller");

const { importContactsSchema } = require("./contacts.validation");
const {
  importContacts,
  blockContacts,
  getBlockedContacts,
  unblockByPhone,
  unblockUser,
} = require("./contacts.controller");

router.post("/import", auth, apiLimiter("contact_import", 3, 3600), validate(importContactsSchema), importContacts);

router.post("/block", auth, apiLimiter("contact_block", 10, 3600), blockContacts);

router.get("/blocked", auth, apiLimiter("contact_blocked_list", 20, 60), getBlockedContacts);

router.delete("/unblock", auth, apiLimiter("contact_unblock", 10, 3600), unblockByPhone);

router.delete("/unblock/user", auth, apiLimiter("contact_unblock_user", 10, 3600), unblockUser);

module.exports = router;
