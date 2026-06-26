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

const findById = async (client, customerId) => {
  const result = await client.query('SELECT * FROM customers WHERE customer_id = $1;', [
    customerId,
  ]);

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
  findById,
  upsert,
};
