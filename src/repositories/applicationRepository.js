const { getPool } = require('../db/postgres');

const mapApplication = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.application_id,
    name: row.name,
    code: row.code,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const create = async ({ name, code, isActive }) => {
  const result = await getPool().query(
    `
      INSERT INTO applications (
        name,
        code,
        is_active
      )
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
    [name, code, isActive]
  );

  return mapApplication(result.rows[0]);
};

const findById = async (applicationId) => {
  const result = await getPool().query(
    'SELECT * FROM applications WHERE application_id = $1;',
    [applicationId]
  );

  return mapApplication(result.rows[0]);
};

const list = async ({ q, isActive, limit, offset }) => {
  const values = [];
  const clauses = [];

  if (q) {
    values.push(`%${q}%`);
    clauses.push(`(name ILIKE $${values.length} OR code ILIKE $${values.length})`);
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
      FROM applications
      ${where}
      ORDER BY created_at DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex};
    `,
    values
  );

  return result.rows.map(mapApplication);
};

const update = async (applicationId, data) => {
  const fields = [];
  const values = [];

  if (data.name !== undefined) {
    values.push(data.name);
    fields.push(`name = $${values.length}`);
  }

  if (data.code !== undefined) {
    values.push(data.code);
    fields.push(`code = $${values.length}`);
  }

  if (data.isActive !== undefined) {
    values.push(data.isActive);
    fields.push(`is_active = $${values.length}`);
  }

  values.push(applicationId);
  const result = await getPool().query(
    `
      UPDATE applications
      SET
        ${fields.join(', ')},
        updated_at = now()
      WHERE application_id = $${values.length}
      RETURNING *;
    `,
    values
  );

  return mapApplication(result.rows[0]);
};

module.exports = {
  create,
  findById,
  list,
  update,
};
