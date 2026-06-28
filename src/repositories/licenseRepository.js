const { getPool } = require('../db/postgres');
const AppError = require('../utils/appError');
const customerRepository = require('./customerRepository');

const parseMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }

  return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
};

const mapLicense = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.LicenseId,
    applicationId: row.ApplicationId,
    applicationName: row.ApplicationName,
    applicationCode: row.ApplicationCode,
    customerId: row.CustomerId,
    customerName: row.CustomerName,
    customerEmail: row.CustomerEmail,
    customerRfc: row.CustomerRfc,
    serialNumberSuffix: row.SerialNumberSuffix,
    status: row.Status,
    validFrom: row.ValidFrom,
    validUntil: row.ValidUntil,
    maxActivations: row.MaxActivations,
    activationCount: row.ActivationCount,
    metadata: parseMetadata(row.MetadataJson),
    revokedAt: row.RevokedAt,
    revokedReason: row.RevokedReason,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
};

const baseSelect = `
  SELECT
    l.license_id AS "LicenseId",
    l.application_id AS "ApplicationId",
    a.name AS "ApplicationName",
    a.code AS "ApplicationCode",
    l.customer_id AS "CustomerId",
    c.name AS "CustomerName",
    c.email AS "CustomerEmail",
    c.rfc AS "CustomerRfc",
    l.serial_number_suffix AS "SerialNumberSuffix",
    l.status AS "Status",
    l.valid_from AS "ValidFrom",
    l.valid_until AS "ValidUntil",
    l.max_activations AS "MaxActivations",
    l.activation_count AS "ActivationCount",
    l.metadata_json AS "MetadataJson",
    l.revoked_at AS "RevokedAt",
    l.revoked_reason AS "RevokedReason",
    l.created_at AS "CreatedAt",
    l.updated_at AS "UpdatedAt"
  FROM licenses AS l
  INNER JOIN applications AS a ON a.application_id = l.application_id
  INNER JOIN customers AS c ON c.customer_id = l.customer_id
`;

const create = async (data) => {
  const result = await data.client.query(
    `
      WITH inserted AS (
        INSERT INTO licenses (
          application_id,
          customer_id,
          serial_number_hash,
          serial_number_suffix,
          status,
          valid_from,
          valid_until,
          max_activations,
          metadata_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING *
      )
      SELECT
        i.license_id AS "LicenseId",
        i.application_id AS "ApplicationId",
        a.name AS "ApplicationName",
        a.code AS "ApplicationCode",
        i.customer_id AS "CustomerId",
        c.name AS "CustomerName",
        c.email AS "CustomerEmail",
        c.rfc AS "CustomerRfc",
        i.serial_number_suffix AS "SerialNumberSuffix",
        i.status AS "Status",
        i.valid_from AS "ValidFrom",
        i.valid_until AS "ValidUntil",
        i.max_activations AS "MaxActivations",
        i.activation_count AS "ActivationCount",
        i.metadata_json AS "MetadataJson",
        i.revoked_at AS "RevokedAt",
        i.revoked_reason AS "RevokedReason",
        i.created_at AS "CreatedAt",
        i.updated_at AS "UpdatedAt"
      FROM inserted AS i
      INNER JOIN applications AS a ON a.application_id = i.application_id
      INNER JOIN customers AS c ON c.customer_id = i.customer_id;
    `,
    [
      data.applicationId,
      data.customerId,
      data.serialNumberHash,
      data.serialNumberSuffix,
      data.status,
      data.validFrom,
      data.validUntil,
      data.maxActivations,
      data.metadataJson,
    ]
  );

  return mapLicense(result.rows[0]);
};

const createWithCustomer = async (data) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const customer = data.customer
      ? await customerRepository.upsert(client, data.customer)
      : await customerRepository.findById(client, data.customerId);

    if (!customer) {
      throw new AppError('Cliente no encontrado.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const license = await create({
      ...data,
      client,
      customerId: customer.id,
    });

    await client.query('COMMIT');
    return license;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findById = async (licenseId) => {
  const result = await getPool().query(`${baseSelect} WHERE l.license_id = $1;`, [licenseId]);

  return mapLicense(result.rows[0]);
};

const findBySerialHash = async (serialNumberHash) => {
  const result = await getPool().query(`${baseSelect} WHERE l.serial_number_hash = $1;`, [
    serialNumberHash,
  ]);

  return mapLicense(result.rows[0]);
};

const findBySerialHashForUpdate = async (client, serialNumberHash) => {
  const result = await client.query(
    `${baseSelect} WHERE l.serial_number_hash = $1 FOR UPDATE OF l;`,
    [serialNumberHash]
  );

  return mapLicense(result.rows[0]);
};

const list = async ({ applicationId, customerId, status, limit, offset }) => {
  const values = [];
  const clauses = [];

  if (applicationId) {
    values.push(applicationId);
    clauses.push(`l.application_id = $${values.length}`);
  }

  if (customerId) {
    values.push(customerId);
    clauses.push(`l.customer_id = $${values.length}`);
  }

  if (status) {
    values.push(status);
    clauses.push(`l.status = $${values.length}`);
  }

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await getPool().query(
    `
      ${baseSelect}
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex};
    `,
    values
  );

  return result.rows.map(mapLicense);
};

const revoke = async ({ licenseId, revokedReason }) => {
  const result = await getPool().query(
    `
      WITH updated AS (
        UPDATE licenses
        SET
          status = 'revoked',
          revoked_at = now(),
          revoked_reason = $2,
          updated_at = now()
        WHERE license_id = $1
        RETURNING *
      )
      SELECT
        u.license_id AS "LicenseId",
        u.application_id AS "ApplicationId",
        a.name AS "ApplicationName",
        a.code AS "ApplicationCode",
        u.customer_id AS "CustomerId",
        c.name AS "CustomerName",
        c.email AS "CustomerEmail",
        c.rfc AS "CustomerRfc",
        u.serial_number_suffix AS "SerialNumberSuffix",
        u.status AS "Status",
        u.valid_from AS "ValidFrom",
        u.valid_until AS "ValidUntil",
        u.max_activations AS "MaxActivations",
        u.activation_count AS "ActivationCount",
        u.metadata_json AS "MetadataJson",
        u.revoked_at AS "RevokedAt",
        u.revoked_reason AS "RevokedReason",
        u.created_at AS "CreatedAt",
        u.updated_at AS "UpdatedAt"
      FROM updated AS u
      INNER JOIN applications AS a ON a.application_id = u.application_id
      INNER JOIN customers AS c ON c.customer_id = u.customer_id;
    `,
    [licenseId, revokedReason || null]
  );

  return mapLicense(result.rows[0]);
};

const syncActivationCount = async (client, licenseId) => {
  const result = await client.query(
    `
      WITH active_activations AS (
        SELECT COUNT(*)::int AS activation_count
        FROM license_activations
        WHERE license_id = $1
          AND deactivated_at IS NULL
      ),
      updated AS (
        UPDATE licenses
        SET
          activation_count = active_activations.activation_count,
          updated_at = now()
        FROM active_activations
        WHERE license_id = $1
        RETURNING *
      )
      SELECT
        u.license_id AS "LicenseId",
        u.application_id AS "ApplicationId",
        a.name AS "ApplicationName",
        a.code AS "ApplicationCode",
        u.customer_id AS "CustomerId",
        c.name AS "CustomerName",
        c.email AS "CustomerEmail",
        c.rfc AS "CustomerRfc",
        u.serial_number_suffix AS "SerialNumberSuffix",
        u.status AS "Status",
        u.valid_from AS "ValidFrom",
        u.valid_until AS "ValidUntil",
        u.max_activations AS "MaxActivations",
        u.activation_count AS "ActivationCount",
        u.metadata_json AS "MetadataJson",
        u.revoked_at AS "RevokedAt",
        u.revoked_reason AS "RevokedReason",
        u.created_at AS "CreatedAt",
        u.updated_at AS "UpdatedAt"
      FROM updated AS u
      INNER JOIN applications AS a ON a.application_id = u.application_id
      INNER JOIN customers AS c ON c.customer_id = u.customer_id;
    `,
    [licenseId]
  );

  return mapLicense(result.rows[0]);
};

const renew = async ({ licenseId, validUntil, status }) => {
  const result = await getPool().query(
    `
      WITH updated AS (
        UPDATE licenses
        SET
          valid_until = $2,
          status = $3,
          revoked_at = NULL,
          revoked_reason = NULL,
          updated_at = now()
        WHERE license_id = $1
        RETURNING *
      )
      SELECT
        u.license_id AS "LicenseId",
        u.application_id AS "ApplicationId",
        a.name AS "ApplicationName",
        a.code AS "ApplicationCode",
        u.customer_id AS "CustomerId",
        c.name AS "CustomerName",
        c.email AS "CustomerEmail",
        c.rfc AS "CustomerRfc",
        u.serial_number_suffix AS "SerialNumberSuffix",
        u.status AS "Status",
        u.valid_from AS "ValidFrom",
        u.valid_until AS "ValidUntil",
        u.max_activations AS "MaxActivations",
        u.activation_count AS "ActivationCount",
        u.metadata_json AS "MetadataJson",
        u.revoked_at AS "RevokedAt",
        u.revoked_reason AS "RevokedReason",
        u.created_at AS "CreatedAt",
        u.updated_at AS "UpdatedAt"
      FROM updated AS u
      INNER JOIN applications AS a ON a.application_id = u.application_id
      INNER JOIN customers AS c ON c.customer_id = u.customer_id;
    `,
    [licenseId, validUntil, status]
  );

  return mapLicense(result.rows[0]);
};

module.exports = {
  createWithCustomer,
  findById,
  findBySerialHash,
  findBySerialHashForUpdate,
  list,
  revoke,
  renew,
  syncActivationCount,
};
