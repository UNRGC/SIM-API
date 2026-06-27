const express = require('express');
const licenseController = require('../controllers/licenseController');
const authenticateApiKey = require('../middlewares/authenticateApiKey');
const { restrictAdminNetwork } = require('../middlewares/restrictAdminNetwork');
const { adminLimiter, validationLimiter } = require('../middlewares/rateLimiters');
const validate = require('../middlewares/validate');
const {
  createLicenseSchema,
  validateLicenseSchema,
  listLicensesSchema,
  licenseIdParamsSchema,
  revokeLicenseSchema,
  renewLicenseSchema,
} = require('../schemas/licenseSchemas');

const router = express.Router();

router.post(
  '/',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(createLicenseSchema),
  licenseController.createLicense
);
router.get(
  '/',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(listLicensesSchema, 'query'),
  licenseController.listLicenses
);
router.post(
  '/validate',
  validationLimiter,
  authenticateApiKey(['admin', 'app']),
  validate(validateLicenseSchema),
  licenseController.validateLicense
);
router.get(
  '/:licenseId',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  licenseController.getLicense
);
router.post(
  '/:licenseId/revoke',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  validate(revokeLicenseSchema),
  licenseController.revokeLicense
);
router.post(
  '/:licenseId/renew',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  validate(renewLicenseSchema),
  licenseController.renewLicense
);

module.exports = router;
