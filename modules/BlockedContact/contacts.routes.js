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

router.post("/import", auth, apiLimiter("contact_import", 3, 300), validate(importContactsSchema), importContacts); // 3 req / 5 mins

router.post("/block", auth, apiLimiter("contact_block", 5, 300), blockContacts); // 5 req / 5 mins

router.get("/blocked", auth, apiLimiter("contact_blocked_list", 20, 300), getBlockedContacts); // 20 req / 5 mins

router.delete("/unblock", auth, apiLimiter("contact_unblock", 20, 300), unblockByPhone); // 20 req / 5 mins

router.delete("/unblock/user", auth, apiLimiter("contact_unblock_user", 20, 300), unblockUser); // 20 req / 5 mins

module.exports = router;
