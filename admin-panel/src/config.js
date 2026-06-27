const path = require('path');

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
  const value = process.env[name];

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
  port: toNumber(process.env.PANEL_PORT, 3100),
  basePath: process.env.PANEL_BASE_PATH || '/',
  trustProxy: toBoolean(process.env.PANEL_TRUST_PROXY, false),
  cookieSecure: toBoolean(process.env.PANEL_COOKIE_SECURE, false),
  sessionMinutes: toNumber(process.env.PANEL_SESSION_MINUTES, 60),
  sessionSecret: required('PANEL_SESSION_SECRET'),
  apiBaseUrl: required('SIM_API_BASE_URL').replace(/\/+$/, ''),
  apiAdminKey: required('SIM_API_ADMIN_KEY'),
  adminUsersFile: resolvePath(process.env.ADMIN_USERS_FILE || './config/admin-users.json'),
};
