const express = require('express');
const { callApi } = require('../apiClient');
const {
  requireAuth,
  requireCsrf,
  requirePermission,
} = require('../session');
const {
  validate,
  listSchema,
  licenseListSchema,
  applicationIdParamsSchema,
  customerIdParamsSchema,
  licenseIdParamsSchema,
  applicationCreateSchema,
  applicationUpdateSchema,
  customerCreateSchema,
  customerUpdateSchema,
  licenseCreateSchema,
  licenseRenewSchema,
  licenseRevokeSchema,
} = require('../schemas');

const router = express.Router();

router.use(requireAuth);
router.use(requireCsrf);

router.get(
  '/applications',
  requirePermission('applications:read'),
  validate(listSchema, 'query'),
  async (req, res, next) => {
    try {
      res.status(200).json(await callApi({ path: '/api/v1/applications', query: req.query }));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/applications',
  requirePermission('applications:write'),
  validate(applicationCreateSchema),
  async (req, res, next) => {
    try {
      res.status(201).json(
        await callApi({ method: 'POST', path: '/api/v1/applications', body: req.body })
      );
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/applications/:applicationId',
  requirePermission('applications:read'),
  validate(applicationIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await callApi({ path: `/api/v1/applications/${req.params.applicationId}` })
      );
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/applications/:applicationId',
  requirePermission('applications:write'),
  validate(applicationIdParamsSchema, 'params'),
  validate(applicationUpdateSchema),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await callApi({
          method: 'PATCH',
          path: `/api/v1/applications/${req.params.applicationId}`,
          body: req.body,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/customers',
  requirePermission('customers:read'),
  validate(listSchema, 'query'),
  async (req, res, next) => {
    try {
      res.status(200).json(await callApi({ path: '/api/v1/customers', query: req.query }));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/customers',
  requirePermission('customers:write'),
  validate(customerCreateSchema),
  async (req, res, next) => {
    try {
      res.status(201).json(await callApi({ method: 'POST', path: '/api/v1/customers', body: req.body }));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/customers/:customerId',
  requirePermission('customers:read'),
  validate(customerIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      res.status(200).json(await callApi({ path: `/api/v1/customers/${req.params.customerId}` }));
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/customers/:customerId',
  requirePermission('customers:write'),
  validate(customerIdParamsSchema, 'params'),
  validate(customerUpdateSchema),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await callApi({
          method: 'PATCH',
          path: `/api/v1/customers/${req.params.customerId}`,
          body: req.body,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/licenses',
  requirePermission('licenses:read'),
  validate(licenseListSchema, 'query'),
  async (req, res, next) => {
    try {
      res.status(200).json(await callApi({ path: '/api/v1/licenses', query: req.query }));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/licenses',
  requirePermission('licenses:write'),
  validate(licenseCreateSchema),
  async (req, res, next) => {
    try {
      res.status(201).json(await callApi({ method: 'POST', path: '/api/v1/licenses', body: req.body }));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/licenses/:licenseId',
  requirePermission('licenses:read'),
  validate(licenseIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      res.status(200).json(await callApi({ path: `/api/v1/licenses/${req.params.licenseId}` }));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/licenses/:licenseId/revoke',
  requirePermission('licenses:write'),
  validate(licenseIdParamsSchema, 'params'),
  validate(licenseRevokeSchema),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await callApi({
          method: 'POST',
          path: `/api/v1/licenses/${req.params.licenseId}/revoke`,
          body: req.body,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/licenses/:licenseId/renew',
  requirePermission('licenses:write'),
  validate(licenseIdParamsSchema, 'params'),
  validate(licenseRenewSchema),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await callApi({
          method: 'POST',
          path: `/api/v1/licenses/${req.params.licenseId}/renew`,
          body: req.body,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
