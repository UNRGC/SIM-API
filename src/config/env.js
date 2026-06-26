require('dotenv').config();

const toBoolean = (value, defaultValue) => {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
};

const toNumber = (value, defaultValue) => {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const toList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

module.exports = {
  app: {
    port: toNumber(process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: toList(process.env.CORS_ORIGINS),
  },
  security: {
    adminApiKeys: toList(process.env.ADMIN_API_KEYS),
    appApiKeys: toList(process.env.APP_API_KEYS),
    licenseHashSecret: process.env.LICENSE_HASH_SECRET,
  },
  database: {
    host: process.env.DB_HOST,
    port: toNumber(process.env.DB_PORT, 5432),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: toBoolean(process.env.DB_SSL, false)
      ? { rejectUnauthorized: toBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true) }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
  },
};
