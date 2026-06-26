const { getPool } = require('../db/postgres');

const create = async ({ licenseId, eventType, actor, ipAddress, details }) => {
  await getPool().query(
    `
      INSERT INTO license_events (
        license_id,
        event_type,
        actor,
        ip_address,
        details_json
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb
      );
    `,
    [licenseId, eventType, actor || null, ipAddress || null, details ? JSON.stringify(details) : null]
  );
};

module.exports = {
  create,
};
