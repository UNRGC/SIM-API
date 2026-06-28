const licenseService = require('../services/licenseService');

const auditContext = (req) => ({
  actor: req.auth?.roles?.join(',') || 'anonymous',
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});

const createLicense = async (req, res, next) => {
  try {
    const license = await licenseService.createLicense(req.body, auditContext(req));
    res.status(201).json({ data: license });
  } catch (error) {
    next(error);
  }
};

const validateLicense = async (req, res, next) => {
  try {
    const result = await licenseService.validateLicense(req.body, auditContext(req), req.auth);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

const deactivateLicense = async (req, res, next) => {
  try {
    const result = await licenseService.deactivateLicense(req.body, auditContext(req));
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

const listLicenses = async (req, res, next) => {
  try {
    const licenses = await licenseService.listLicenses(req.query);
    res.status(200).json({ data: licenses });
  } catch (error) {
    next(error);
  }
};

const getLicense = async (req, res, next) => {
  try {
    const license = await licenseService.getLicense(req.params.licenseId);
    res.status(200).json({ data: license });
  } catch (error) {
    next(error);
  }
};

const listLicenseActivations = async (req, res, next) => {
  try {
    const activations = await licenseService.listLicenseActivations(req.params.licenseId);
    res.status(200).json({ data: activations });
  } catch (error) {
    next(error);
  }
};

const deactivateLicenseActivation = async (req, res, next) => {
  try {
    const result = await licenseService.deactivateLicenseActivation(
      req.params.licenseId,
      req.params.activationId,
      auditContext(req)
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

const revokeLicense = async (req, res, next) => {
  try {
    const license = await licenseService.revokeLicense(
      req.params.licenseId,
      req.body,
      auditContext(req)
    );
    res.status(200).json({ data: license });
  } catch (error) {
    next(error);
  }
};

const renewLicense = async (req, res, next) => {
  try {
    const license = await licenseService.renewLicense(
      req.params.licenseId,
      req.body,
      auditContext(req)
    );
    res.status(200).json({ data: license });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLicense,
  deactivateLicense,
  deactivateLicenseActivation,
  validateLicense,
  listLicenses,
  listLicenseActivations,
  getLicense,
  revokeLicense,
  renewLicense,
};
