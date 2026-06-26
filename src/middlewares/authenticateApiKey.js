const crypto = require('crypto');
const { security } = require('../config/env');
const AppError = require('../utils/appError');

const safeEqual = (received, expected) => {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const hasMatchingKey = (receivedKey, allowedKeys) =>
  Boolean(receivedKey) && allowedKeys.some((allowedKey) => safeEqual(receivedKey, allowedKey));

const authenticateApiKey = (allowedRoles) => (req, _res, next) => {
  const apiKey = req.get('x-api-key');
  const roles = [];

  if (hasMatchingKey(apiKey, security.adminApiKeys)) {
    roles.push('admin');
  }

  if (hasMatchingKey(apiKey, security.appApiKeys)) {
    roles.push('app');
  }

  const isAllowed = roles.some((role) => allowedRoles.includes(role));

  if (!isAllowed) {
    return next(new AppError('API key invalida o sin permisos.', 401, 'UNAUTHORIZED'));
  }

  req.auth = {
    roles,
    isAdmin: roles.includes('admin'),
    isApp: roles.includes('app'),
  };

  return next();
};

module.exports = authenticateApiKey;
