const express = require('express');
const applicationController = require('../controllers/applicationController');
const authenticateApiKey = require('../middlewares/authenticateApiKey');
const { restrictAdminNetwork } = require('../middlewares/restrictAdminNetwork');
const { adminLimiter } = require('../middlewares/rateLimiters');
const validate = require('../middlewares/validate');
const {
  applicationIdParamsSchema,
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsSchema,
} = require('../schemas/applicationSchemas');

const router = express.Router();

router.use(restrictAdminNetwork);

router.post(
  '/',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(createApplicationSchema),
  applicationController.createApplication
);
router.get(
  '/',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(listApplicationsSchema, 'query'),
  applicationController.listApplications
);
router.get(
  '/:applicationId',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(applicationIdParamsSchema, 'params'),
  applicationController.getApplication
);
router.patch(
  '/:applicationId',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(applicationIdParamsSchema, 'params'),
  validate(updateApplicationSchema),
  applicationController.updateApplication
);

module.exports = router;
