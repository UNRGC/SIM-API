const express = require('express');
const licenseController = require('../controllers/licenseController');
const authenticateApiKey = require('../middlewares/authenticateApiKey');
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
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(createLicenseSchema),
  licenseController.createLicense
);
router.get(
  '/',
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
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  licenseController.getLicense
);
router.post(
  '/:licenseId/revoke',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  validate(revokeLicenseSchema),
  licenseController.revokeLicense
);
router.post(
  '/:licenseId/renew',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  validate(renewLicenseSchema),
  licenseController.renewLicense
);

module.exports = router;
