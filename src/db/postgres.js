const { Pool } = require('pg');
const { database } = require('../config/env');
const logger = require('../utils/logger');

let pool;

const assertDatabaseConfig = () => {
  const requiredKeys = ['host', 'database', 'user', 'password'];
  const missing = requiredKeys.filter((key) => !database[key]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de conexion PostgreSQL: ${missing.join(', ')}`);
  }
};

const getPool = () => {
  if (!pool) {
    assertDatabaseConfig();
    pool = new Pool(database);
    pool.on('error', (error) => {
      logger.error({ err: error }, 'PostgreSQL pool error');
    });
  }

  return pool;
};

const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};

module.exports = {
  getPool,
  closePool,
};
