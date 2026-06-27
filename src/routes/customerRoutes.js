const express = require('express');
const customerController = require('../controllers/customerController');
const authenticateApiKey = require('../middlewares/authenticateApiKey');
const { restrictAdminNetwork } = require('../middlewares/restrictAdminNetwork');
const { adminLimiter } = require('../middlewares/rateLimiters');
const validate = require('../middlewares/validate');
const {
  customerIdParamsSchema,
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
} = require('../schemas/customerSchemas');

const router = express.Router();

router.use(restrictAdminNetwork);

router.post(
  '/',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(createCustomerSchema),
  customerController.createCustomer
);
router.get(
  '/',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(listCustomersSchema, 'query'),
  customerController.listCustomers
);
router.get(
  '/:customerId',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(customerIdParamsSchema, 'params'),
  customerController.getCustomer
);
router.patch(
  '/:customerId',
  adminLimiter,
  authenticateApiKey(['admin']),
  validate(customerIdParamsSchema, 'params'),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);

module.exports = router;
