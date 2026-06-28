const { getPool } = require('../db/postgres');

const mapActivation = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.LicenseActivationId,
    licenseId: row.LicenseId,
    deviceIdHash: row.DeviceIdHash,
    deviceName: row.DeviceName,
    activatedAt: row.ActivatedAt,
    lastSeenAt: row.LastSeenAt,
    deactivatedAt: row.DeactivatedAt,
  };
};

const findActiveByLicenseAndDevice = async (client, { licenseId, deviceIdHash }) => {
  const result = await client.query(
    `
      SELECT
        license_activation_id AS "LicenseActivationId",
        license_id AS "LicenseId",
        device_id_hash AS "DeviceIdHash",
        device_name AS "DeviceName",
        activated_at AS "ActivatedAt",
        last_seen_at AS "LastSeenAt",
        deactivated_at AS "DeactivatedAt"
      FROM license_activations
      WHERE license_id = $1
        AND device_id_hash = $2
        AND deactivated_at IS NULL;
    `,
    [licenseId, deviceIdHash]
  );

  return mapActivation(result.rows[0]);
};

const listActiveByLicense = async (licenseId) => {
  const result = await getPool().query(
    `
      SELECT
        license_activation_id AS "LicenseActivationId",
        license_id AS "LicenseId",
        device_id_hash AS "DeviceIdHash",
        device_name AS "DeviceName",
        activated_at AS "ActivatedAt",
        last_seen_at AS "LastSeenAt",
        deactivated_at AS "DeactivatedAt"
      FROM license_activations
      WHERE license_id = $1
        AND deactivated_at IS NULL
      ORDER BY last_seen_at DESC;
    `,
    [licenseId]
  );

  return result.rows.map(mapActivation);
};

const touch = async (client, { activationId, deviceName }) => {
  const result = await client.query(
    `
      UPDATE license_activations
      SET
        device_name = COALESCE($2, device_name),
        last_seen_at = now()
      WHERE license_activation_id = $1
      RETURNING
        license_activation_id AS "LicenseActivationId",
        license_id AS "LicenseId",
        device_id_hash AS "DeviceIdHash",
        device_name AS "DeviceName",
        activated_at AS "ActivatedAt",
        last_seen_at AS "LastSeenAt",
        deactivated_at AS "DeactivatedAt";
    `,
    [activationId, deviceName || null]
  );

  return mapActivation(result.rows[0]);
};

const create = async (client, { licenseId, deviceIdHash, deviceName }) => {
  const result = await client.query(
    `
      INSERT INTO license_activations (
        license_id,
        device_id_hash,
        device_name
      )
      VALUES ($1, $2, $3)
      RETURNING
        license_activation_id AS "LicenseActivationId",
        license_id AS "LicenseId",
        device_id_hash AS "DeviceIdHash",
        device_name AS "DeviceName",
        activated_at AS "ActivatedAt",
        last_seen_at AS "LastSeenAt",
        deactivated_at AS "DeactivatedAt";
    `,
    [licenseId, deviceIdHash, deviceName || null]
  );

  return mapActivation(result.rows[0]);
};

const createOrTouch = async (client, { licenseId, deviceIdHash, deviceName }) => {
  const existing = await findActiveByLicenseAndDevice(client, { licenseId, deviceIdHash });

  if (existing) {
    return {
      activation: await touch(client, {
        activationId: existing.id,
        deviceName,
      }),
      created: false,
    };
  }

  return {
    activation: await create(client, {
      licenseId,
      deviceIdHash,
      deviceName,
    }),
    created: true,
  };
};

const deactivateByDevice = async (client, { licenseId, deviceIdHash }) => {
  const result = await client.query(
    `
      UPDATE license_activations
      SET deactivated_at = now()
      WHERE license_id = $1
        AND device_id_hash = $2
        AND deactivated_at IS NULL
      RETURNING
        license_activation_id AS "LicenseActivationId",
        license_id AS "LicenseId",
        device_id_hash AS "DeviceIdHash",
        device_name AS "DeviceName",
        activated_at AS "ActivatedAt",
        last_seen_at AS "LastSeenAt",
        deactivated_at AS "DeactivatedAt";
    `,
    [licenseId, deviceIdHash]
  );

  return mapActivation(result.rows[0]);
};

const deactivateById = async (client, { licenseId, activationId }) => {
  const result = await client.query(
    `
      UPDATE license_activations
      SET deactivated_at = now()
      WHERE license_activation_id = $1
        AND license_id = $2
        AND deactivated_at IS NULL
      RETURNING
        license_activation_id AS "LicenseActivationId",
        license_id AS "LicenseId",
        device_id_hash AS "DeviceIdHash",
        device_name AS "DeviceName",
        activated_at AS "ActivatedAt",
        last_seen_at AS "LastSeenAt",
        deactivated_at AS "DeactivatedAt";
    `,
    [activationId, licenseId]
  );

  return mapActivation(result.rows[0]);
};

const countActive = async (client, licenseId) => {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS "ActivationCount"
      FROM license_activations
      WHERE license_id = $1
        AND deactivated_at IS NULL;
    `,
    [licenseId]
  );

  return result.rows[0]?.ActivationCount || 0;
};

module.exports = {
  countActive,
  createOrTouch,
  deactivateByDevice,
  deactivateById,
  findActiveByLicenseAndDevice,
  listActiveByLicense,
};
