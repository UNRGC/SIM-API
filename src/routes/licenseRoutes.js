const express = require('express');
const licenseController = require('../controllers/licenseController');
const authenticateApiKey = require('../middlewares/authenticateApiKey');
const { restrictAdminNetwork } = require('../middlewares/restrictAdminNetwork');
const { adminLimiter, validationLimiter } = require('../middlewares/rateLimiters');
const validate = require('../middlewares/validate');
const {
  createLicenseSchema,
  deactivateLicenseSchema,
  validateLicenseSchema,
  listLicensesSchema,
  licenseActivationIdParamsSchema,
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
router.post(
  '/deactivate',
  validationLimiter,
  authenticateApiKey(['admin', 'app']),
  validate(deactivateLicenseSchema),
  licenseController.deactivateLicense
);
router.get(
  '/:licenseId',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  licenseController.getLicense
);
router.get(
  '/:licenseId/activations',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseIdParamsSchema, 'params'),
  licenseController.listLicenseActivations
);
router.post(
  '/:licenseId/activations/:activationId/deactivate',
  restrictAdminNetwork,
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(licenseActivationIdParamsSchema, 'params'),
  licenseController.deactivateLicenseActivation
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
