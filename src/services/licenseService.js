const AppError = require('../utils/appError');
const licenseRepository = require('../repositories/licenseRepository');
const licenseActivationRepository = require('../repositories/licenseActivationRepository');
const licenseEventRepository = require('../repositories/licenseEventRepository');
const { getPool } = require('../db/postgres');
const { generateSerialNumber, hashDeviceId, hashSerialNumber } = require('../utils/licenseKey');

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

const buildDeactivationResponse = ({ deactivated, reason, license }) => ({
  deactivated,
  reason,
  message: deactivated ? 'Activacion liberada.' : 'No fue posible liberar la activacion.',
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

const validateLicenseDevice = async ({ license, payload }) => {
  if (!payload.deviceId) {
    return {
      valid: true,
      reason: null,
      license,
    };
  }

  const pool = getPool();
  const client = await pool.connect();
  const deviceIdHash = hashDeviceId(payload.deviceId);

  try {
    await client.query('BEGIN');

    const lockedLicense = await licenseRepository.findBySerialHashForUpdate(
      client,
      hashSerialNumber(payload.serialNumber)
    );

    if (!lockedLicense) {
      await client.query('COMMIT');
      return {
        valid: false,
        reason: 'not_found',
        license: null,
      };
    }

    const lockedStatus = resolveRuntimeStatus(lockedLicense);

    if (lockedStatus !== 'valid') {
      await client.query('COMMIT');
      return {
        valid: false,
        reason: lockedStatus,
        license: lockedLicense,
      };
    }

    const { created } = await licenseActivationRepository.createOrTouch(client, {
      licenseId: lockedLicense.id,
      deviceIdHash,
      deviceName: payload.deviceName,
    });

    if (created) {
      const activeCount = await licenseActivationRepository.countActive(client, lockedLicense.id);

      if (activeCount > lockedLicense.maxActivations) {
        await client.query('ROLLBACK');
        return {
          valid: false,
          reason: 'activation_limit_reached',
          license: {
            ...lockedLicense,
            activationCount: lockedLicense.activationCount,
          },
        };
      }
    }

    const updatedLicense = await licenseRepository.syncActivationCount(client, lockedLicense.id);

    await client.query('COMMIT');

    return {
      valid: true,
      reason: null,
      license: updatedLicense,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const validateLicense = async (payload, audit, auth) => {
  if (auth?.isApp && !auth?.isAdmin && !payload.deviceId) {
    throw new AppError(
      'deviceId es obligatorio al validar desde una aplicacion.',
      400,
      'DEVICE_ID_REQUIRED'
    );
  }

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

  const result =
    status === 'valid'
      ? await validateLicenseDevice({ license, payload })
      : {
          valid: false,
          reason: status,
          license,
        };

  await recordEvent(
    result.license?.id,
    result.valid ? 'license.validated' : 'license.validation_failed',
    audit,
    {
      reason: result.valid ? null : result.reason,
      activatedDevice: Boolean(payload.deviceId),
      deviceName: payload.deviceName || null,
    }
  );

  return buildValidationResponse({
    valid: result.valid,
    reason: result.reason,
    license: result.license,
  });
};

const deactivateLicense = async (payload, audit) => {
  const serialNumberHash = hashSerialNumber(payload.serialNumber);
  const license = await licenseRepository.findBySerialHash(serialNumberHash);

  if (!license) {
    return buildDeactivationResponse({
      deactivated: false,
      reason: 'not_found',
      license: null,
    });
  }

  if (payload.applicationId && payload.applicationId !== license.applicationId) {
    await recordEvent(license.id, 'license.activation_deactivation_failed', audit, {
      reason: 'application_mismatch',
      applicationId: payload.applicationId,
    });

    return buildDeactivationResponse({
      deactivated: false,
      reason: 'application_mismatch',
      license,
    });
  }

  if (payload.customerId && payload.customerId !== license.customerId) {
    await recordEvent(license.id, 'license.activation_deactivation_failed', audit, {
      reason: 'customer_mismatch',
      customerId: payload.customerId,
    });

    return buildDeactivationResponse({
      deactivated: false,
      reason: 'customer_mismatch',
      license,
    });
  }

  const pool = getPool();
  const client = await pool.connect();
  const deviceIdHash = hashDeviceId(payload.deviceId);
  let transactionClosed = false;
  let eventDetails = null;
  let response = null;

  try {
    await client.query('BEGIN');

    const lockedLicense = await licenseRepository.findBySerialHashForUpdate(client, serialNumberHash);
    if (!lockedLicense) {
      await client.query('ROLLBACK');
      transactionClosed = true;
      return buildDeactivationResponse({
        deactivated: false,
        reason: 'not_found',
        license: null,
      });
    }

    const activation = await licenseActivationRepository.deactivateByDevice(client, {
      licenseId: lockedLicense.id,
      deviceIdHash,
    });

    if (!activation) {
      await client.query('ROLLBACK');
      transactionClosed = true;
      eventDetails = {
        eventType: 'license.activation_deactivation_failed',
        licenseId: lockedLicense.id,
        reason: 'activation_not_found',
      };
      response = buildDeactivationResponse({
        deactivated: false,
        reason: 'activation_not_found',
        license: lockedLicense,
      });
    } else {
      const updatedLicense = await licenseRepository.syncActivationCount(client, lockedLicense.id);

      await client.query('COMMIT');
      transactionClosed = true;

      eventDetails = {
        eventType: 'license.activation_deactivated',
        licenseId: updatedLicense.id,
        deviceName: activation.deviceName || null,
      };
      response = buildDeactivationResponse({
        deactivated: true,
        reason: null,
        license: updatedLicense,
      });
    }
  } catch (error) {
    if (!transactionClosed) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }

  if (eventDetails) {
    await recordEvent(eventDetails.licenseId, eventDetails.eventType, audit, {
      reason: eventDetails.reason,
      deviceName: eventDetails.deviceName,
    });
  }

  return response;
};

const listLicenses = (filters) => licenseRepository.list(filters);

const toPublicActivation = (activation) => ({
  id: activation.id,
  licenseId: activation.licenseId,
  deviceName: activation.deviceName,
  activatedAt: activation.activatedAt,
  lastSeenAt: activation.lastSeenAt,
});

const getLicense = async (licenseId) => {
  const license = await licenseRepository.findById(licenseId);

  if (!license) {
    throw new AppError('Licencia no encontrada.', 404, 'LICENSE_NOT_FOUND');
  }

  return license;
};

const listLicenseActivations = async (licenseId) => {
  await getLicense(licenseId);
  const activations = await licenseActivationRepository.listActiveByLicense(licenseId);

  return activations.map(toPublicActivation);
};

const deactivateLicenseActivation = async (licenseId, activationId, audit) => {
  await getLicense(licenseId);

  const pool = getPool();
  const client = await pool.connect();
  let transactionClosed = false;
  let eventDetails = null;
  let response = null;

  try {
    await client.query('BEGIN');

    const activation = await licenseActivationRepository.deactivateById(client, {
      licenseId,
      activationId,
    });

    if (!activation) {
      await client.query('ROLLBACK');
      transactionClosed = true;
      throw new AppError('Activacion no encontrada.', 404, 'ACTIVATION_NOT_FOUND');
    }

    const updatedLicense = await licenseRepository.syncActivationCount(client, licenseId);

    await client.query('COMMIT');
    transactionClosed = true;

    eventDetails = {
      eventType: 'license.activation_deactivated',
      licenseId: updatedLicense.id,
      activationId,
      deviceName: activation.deviceName || null,
      source: 'admin',
    };
    response = buildDeactivationResponse({
      deactivated: true,
      reason: null,
      license: updatedLicense,
    });
  } catch (error) {
    if (!transactionClosed) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }

  await recordEvent(eventDetails.licenseId, eventDetails.eventType, audit, {
    activationId: eventDetails.activationId,
    deviceName: eventDetails.deviceName,
    source: eventDetails.source,
  });

  return response;
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
  deactivateLicense,
  deactivateLicenseActivation,
  validateLicense,
  listLicenses,
  listLicenseActivations,
  getLicense,
  revokeLicense,
  renewLicense,
  buildValidationResponse,
  buildDeactivationResponse,
};
