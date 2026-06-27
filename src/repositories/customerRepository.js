const { getPool } = require('../db/postgres');

const mapCustomer = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.customer_id,
    externalRef: row.external_ref,
    name: row.name,
    email: row.email,
    rfc: row.rfc,
    fiscalRegime: row.fiscal_regime,
    postalCode: row.postal_code,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getQueryClient = (client) => client || getPool();

const create = async (customer) => {
  const result = await getPool().query(
    `
      INSERT INTO customers (
        external_ref,
        name,
        email,
        rfc,
        fiscal_regime,
        postal_code,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `,
    [
      customer.externalRef || null,
      customer.name,
      customer.email || null,
      customer.rfc || null,
      customer.fiscalRegime || null,
      customer.postalCode || null,
      customer.isActive,
    ]
  );

  return mapCustomer(result.rows[0]);
};

const findById = async (client, customerId) => {
  const result = await getQueryClient(client).query(
    'SELECT * FROM customers WHERE customer_id = $1;',
    [customerId]
  );

  return mapCustomer(result.rows[0]);
};

const list = async ({ q, isActive, limit, offset }) => {
  const values = [];
  const clauses = [];

  if (q) {
    values.push(`%${q}%`);
    clauses.push(
      `(name ILIKE $${values.length} OR email ILIKE $${values.length} OR external_ref ILIKE $${values.length} OR rfc ILIKE $${values.length})`
    );
  }

  if (isActive !== undefined) {
    values.push(isActive);
    clauses.push(`is_active = $${values.length}`);
  }

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await getPool().query(
    `
      SELECT *
      FROM customers
      ${where}
      ORDER BY created_at DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex};
    `,
    values
  );

  return result.rows.map(mapCustomer);
};

const update = async (customerId, data) => {
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (data.externalRef !== undefined) {
    addField('external_ref', data.externalRef);
  }

  if (data.name !== undefined) {
    addField('name', data.name);
  }

  if (data.email !== undefined) {
    addField('email', data.email);
  }

  if (data.rfc !== undefined) {
    addField('rfc', data.rfc);
  }

  if (data.fiscalRegime !== undefined) {
    addField('fiscal_regime', data.fiscalRegime);
  }

  if (data.postalCode !== undefined) {
    addField('postal_code', data.postalCode);
  }

  if (data.isActive !== undefined) {
    addField('is_active', data.isActive);
  }

  values.push(customerId);
  const result = await getPool().query(
    `
      UPDATE customers
      SET
        ${fields.join(', ')},
        updated_at = now()
      WHERE customer_id = $${values.length}
      RETURNING *;
    `,
    values
  );

  return mapCustomer(result.rows[0]);
};

const upsert = async (client, customer) => {
  if (customer.externalRef) {
    const result = await client.query(
      `
        INSERT INTO customers (
          external_ref,
          name,
          email,
          rfc,
          fiscal_regime,
          postal_code
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (external_ref) WHERE external_ref IS NOT NULL DO UPDATE
        SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          rfc = EXCLUDED.rfc,
          fiscal_regime = EXCLUDED.fiscal_regime,
          postal_code = EXCLUDED.postal_code,
          updated_at = now()
        RETURNING *;
      `,
      [
        customer.externalRef,
        customer.name,
        customer.email || null,
        customer.rfc || null,
        customer.fiscalRegime || null,
        customer.postalCode || null,
      ]
    );

    return mapCustomer(result.rows[0]);
  }

  const result = await client.query(
    `
      INSERT INTO customers (
        name,
        email,
        rfc,
        fiscal_regime,
        postal_code
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
    [
      customer.name,
      customer.email || null,
      customer.rfc || null,
      customer.fiscalRegime || null,
      customer.postalCode || null,
    ]
  );

  return mapCustomer(result.rows[0]);
};

module.exports = {
  create,
  findById,
  list,
  update,
  upsert,
};
