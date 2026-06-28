require('dotenv').config();

const fs = require('fs');

const getEnv = (name) => {
  const directValue = process.env[name];
  const filePath = process.env[`${name}_FILE`];
  const hasDirectValue = directValue !== undefined && directValue !== '';
  const hasFilePath = filePath !== undefined && filePath !== '';

  if (hasDirectValue && hasFilePath) {
    throw new Error(`Define solo ${name} o ${name}_FILE.`);
  }

  if (hasFilePath) {
    return fs.readFileSync(filePath, 'utf8').trim();
  }

  return directValue;
};

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

const nodeEnv = getEnv('NODE_ENV') || 'development';
const adminAllowedIps = toList(
  getEnv('ADMIN_ALLOWED_IPS') === undefined
    ? nodeEnv === 'production'
      ? ''
      : 'loopback'
    : getEnv('ADMIN_ALLOWED_IPS')
);

if (nodeEnv === 'production' && adminAllowedIps.length === 0) {
  throw new Error('ADMIN_ALLOWED_IPS es requerido en produccion.');
}

module.exports = {
  app: {
    port: toNumber(getEnv('PORT'), 3000),
    nodeEnv,
    corsOrigins: toList(getEnv('CORS_ORIGINS')),
    trustProxy: toBoolean(getEnv('TRUST_PROXY'), false),
  },
  security: {
    adminApiKeys: toList(getEnv('ADMIN_API_KEYS')),
    appApiKeys: toList(getEnv('APP_API_KEYS')),
    licenseHashSecret: getEnv('LICENSE_HASH_SECRET'),
    adminAllowedIps,
  },
  database: {
    host: getEnv('DB_HOST'),
    port: toNumber(getEnv('DB_PORT'), 5432),
    database: getEnv('DB_DATABASE'),
    user: getEnv('DB_USER'),
    password: getEnv('DB_PASSWORD'),
    ssl: toBoolean(getEnv('DB_SSL'), false)
      ? { rejectUnauthorized: toBoolean(getEnv('DB_SSL_REJECT_UNAUTHORIZED'), true) }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
  },
};
