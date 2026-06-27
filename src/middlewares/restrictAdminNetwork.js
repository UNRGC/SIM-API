const net = require('net');
const { security } = require('../config/env');
const AppError = require('../utils/appError');

const normalizeIp = (value) => {
  if (!value) {
    return '';
  }

  if (value.startsWith('::ffff:')) {
    return value.slice(7);
  }

  return value;
};

const ipv4ToInt = (ip) =>
  ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;

const isLoopback = (ip) =>
  ip === '127.0.0.1' ||
  ip === '::1' ||
  ip === 'localhost' ||
  (net.isIP(ip) === 4 && ip.startsWith('127.'));

const matchesCidr = (ip, rule) => {
  const [base, bitsValue] = rule.split('/');
  const bits = Number(bitsValue);

  if (!Number.isInteger(bits)) {
    return false;
  }

  const normalizedBase = normalizeIp(base);

  if (net.isIP(ip) === 4 && net.isIP(normalizedBase) === 4 && bits >= 0 && bits <= 32) {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ipv4ToInt(ip) & mask) === (ipv4ToInt(normalizedBase) & mask);
  }

  if (net.isIP(ip) === 6 && net.isIP(normalizedBase) === 6) {
    return bits === 128 && ip === normalizedBase;
  }

  return false;
};

const matchesRule = (ip, rule) => {
  if (rule === 'loopback') {
    return isLoopback(ip);
  }

  if (rule.includes('/')) {
    return matchesCidr(ip, rule);
  }

  return ip === normalizeIp(rule);
};

const isAllowed = (ip, rules = security.adminAllowedIps) => {
  const normalizedIp = normalizeIp(ip);
  return rules.some((rule) => matchesRule(normalizedIp, rule));
};

const restrictAdminNetwork = (req, _res, next) => {
  if (isAllowed(req.ip)) {
    return next();
  }

  return next(new AppError('Origen administrativo no permitido.', 403, 'ADMIN_NETWORK_FORBIDDEN'));
};

module.exports = {
  restrictAdminNetwork,
  isAllowed,
  normalizeIp,
};
