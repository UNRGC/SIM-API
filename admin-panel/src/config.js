const fs = require('fs');
const path = require('path');

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

const required = (name) => {
  const value = getEnv(name);

  if (process.env.NODE_ENV === 'test') {
    return value || `test-${name.toLowerCase()}`;
  }

  if (!value) {
    throw new Error(`Falta variable requerida: ${name}`);
  }

  return value;
};

const resolvePath = (value) => path.resolve(process.cwd(), value);

module.exports = {
  port: toNumber(getEnv('PANEL_PORT'), 3100),
  basePath: getEnv('PANEL_BASE_PATH') || '/',
  trustProxy: toBoolean(getEnv('PANEL_TRUST_PROXY'), false),
  cookieSecure: toBoolean(getEnv('PANEL_COOKIE_SECURE'), false),
  sessionMinutes: toNumber(getEnv('PANEL_SESSION_MINUTES'), 60),
  sessionSecret: required('PANEL_SESSION_SECRET'),
  apiBaseUrl: required('SIM_API_BASE_URL').replace(/\/+$/, ''),
  apiAdminKey: required('SIM_API_ADMIN_KEY'),
  adminUsersFile: resolvePath(getEnv('ADMIN_USERS_FILE') || './config/admin-users.json'),
};
