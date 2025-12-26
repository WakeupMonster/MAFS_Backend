const express = require("express");
const router = express.Router();

const auth = require("../auth/auth.middleware");
const validate = require("../../common/middlewares/validate");

// const {importContacts,blockContacts,getBlockedContacts,unblockContact} = require("./contacts.controller");

const {importContactsSchema,blockContactsSchema} = require("./contacts.validation");
const { importContacts, blockContacts, getBlockedContacts, unblockByPhone } = require("./contacts.controller");

router.post("/import",auth,validate(importContactsSchema),importContacts);

router.post("/block",auth,validate(blockContactsSchema),blockContacts);

router.get("/blocked", auth, getBlockedContacts);

router.delete("/unblock", auth, unblockByPhone
);

module.exports = router;