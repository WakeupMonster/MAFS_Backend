const express = require('express');
const router = express.Router();
const kycAdminController = require('../../../modules/kyc/admin/kyc.admin.controller');

router.get('/pending', kycAdminController.listPendingKyc);

router.get('/:userId', kycAdminController.getKycDetails);


router.post('/:userId/approve', kycAdminController.approveKyc);

router.post('/:userId/reject', kycAdminController.rejectKyc);

module.exports = router;