const AppError = require('../utils/appError');
const licenseRepository = require('../repositories/licenseRepository');
const licenseEventRepository = require('../repositories/licenseEventRepository');
const { generateSerialNumber, hashSerialNumber } = require('../utils/licenseKey');

const MAX_SERIAL_GENERATION_ATTEMPTS = 5;

const toPublicLicense = (license, serialNumber) => ({
  ...license,
  serialNumber,
});

const toValidationLicense = (license) => {
  if (!license) {
    return null;
  }

  const { customerRfc, ...safeLicense } = license;
  return safeLicense;
};

const resolveRuntimeStatus = (license, now = new Date()) => {
  if (!license) {
    return 'not_found';
  }

  if (license.status === 'revoked') {
    return 'revoked';
  }

  if (license.status === 'suspended') {
    return 'suspended';
  }

  if (new Date(license.validFrom) > now) {
    return 'not_yet_valid';
  }

  if (new Date(license.validUntil) <= now || license.status === 'expired') {
    return 'expired';
  }

  return 'valid';
};

const buildValidationResponse = ({ valid, reason, license }) => ({
  valid,
  reason,
  message: valid ? 'Licencia valida.' : 'Licencia invalida.',
  ownerName: license?.customerName || license?.metadata?.ownerName || null,
  ownerEmail: license?.customerEmail || null,
  applicationName: license?.applicationName || null,
  applicationCode: license?.applicationCode || null,
  status: license ? resolveRuntimeStatus(license) : 'not_found',
  validFrom: license?.validFrom || null,
  validUntil: license?.validUntil || null,
  license: toValidationLicense(license),
});

const recordEvent = async (licenseId, eventType, audit, details) => {
  if (!licenseId) {
    return;
  }

  await licenseEventRepository.create({
    licenseId,
    eventType,
    actor: audit?.actor,
    ipAddress: audit?.ipAddress,
    details: {
      ...details,
      userAgent: audit?.userAgent,
    },
  });
};

const createLicense = async (payload, audit) => {
  const validFrom = payload.validFrom || new Date();
  const validUntil = payload.validUntil;

  if (validUntil <= validFrom) {
    throw new AppError('La vigencia final debe ser posterior a la vigencia inicial.', 400, 'INVALID_VALIDITY');
  }

  for (let attempt = 0; attempt < MAX_SERIAL_GENERATION_ATTEMPTS; attempt += 1) {
    const serialNumber = generateSerialNumber();
    const serialNumberHash = hashSerialNumber(serialNumber);
    const existing = await licenseRepository.findBySerialHash(serialNumberHash);

    if (existing) {
      continue;
    }

    const license = await licenseRepository.createWithCustomer({
      applicationId: payload.applicationId,
      customerId: payload.customerId,
      customer: payload.customer,
      serialNumberHash,
      serialNumberSuffix: serialNumber.slice(-8),
      status: 'active',
      validFrom,
      validUntil,
      maxActivations: payload.maxActivations,
      metadataJson: payload.metadata ? JSON.stringify(payload.metadata) : null,
    });

    await recordEvent(license.id, 'license.created', audit, {
      applicationId: license.applicationId,
      customerId: license.customerId,
      validUntil: license.validUntil,
    });

    return toPublicLicense(license, serialNumber);
  }

  throw new AppError('No fue posible generar un numero de serie unico.', 503, 'SERIAL_GENERATION_FAILED');
};

const validateLicense = async (payload, audit) => {
  const serialNumberHash = hashSerialNumber(payload.serialNumber);
  const license = await licenseRepository.findBySerialHash(serialNumberHash);
  const status = resolveRuntimeStatus(license);

  if (!license) {
    return buildValidationResponse({
      valid: false,
      reason: 'not_found',
      license: null,
    });
  }

  if (payload.applicationId && payload.applicationId !== license.applicationId) {
    await recordEvent(license.id, 'license.validation_failed', audit, {
      reason: 'application_mismatch',
      applicationId: payload.applicationId,
    });

    return buildValidationResponse({
      valid: false,
      reason: 'application_mismatch',
      license,
    });
  }

  if (payload.customerId && payload.customerId !== license.customerId) {
    await recordEvent(license.id, 'license.validation_failed', audit, {
      reason: 'customer_mismatch',
      customerId: payload.customerId,
    });

    return buildValidationResponse({
      valid: false,
      reason: 'customer_mismatch',
      license,
    });
  }

  await recordEvent(
    license.id,
    status === 'valid' ? 'license.validated' : 'license.validation_failed',
    audit,
    {
      reason: status === 'valid' ? null : status,
    }
  );

  return buildValidationResponse({
    valid: status === 'valid',
    reason: status === 'valid' ? null : status,
    license,
  });
};

const listLicenses = (filters) => licenseRepository.list(filters);

const getLicense = async (licenseId) => {
  const license = await licenseRepository.findById(licenseId);

  if (!license) {
    throw new AppError('Licencia no encontrada.', 404, 'LICENSE_NOT_FOUND');
  }

  return license;
};

const revokeLicense = async (licenseId, payload, audit) => {
  await getLicense(licenseId);
  const license = await licenseRepository.revoke({
    licenseId,
    revokedReason: payload.reason,
  });

  await recordEvent(license.id, 'license.revoked', audit, {
    reason: payload.reason || null,
  });

  return license;
};

const renewLicense = async (licenseId, payload, audit) => {
  const current = await getLicense(licenseId);
  const validUntil = payload.validUntil;

  if (validUntil <= new Date(current.validFrom)) {
    throw new AppError('La nueva vigencia final debe ser posterior a validFrom.', 400, 'INVALID_VALIDITY');
  }

  const status = validUntil <= new Date() ? 'expired' : 'active';

  const license = await licenseRepository.renew({
    licenseId,
    validUntil,
    status,
  });

  await recordEvent(license.id, 'license.renewed', audit, {
    validUntil: license.validUntil,
    status: license.status,
  });

  return license;
};

module.exports = {
  createLicense,
  validateLicense,
  listLicenses,
  getLicense,
  revokeLicense,
  renewLicense,
  buildValidationResponse,
};
