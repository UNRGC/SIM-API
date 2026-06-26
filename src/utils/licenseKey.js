const crypto = require('crypto');
const { security } = require('../config/env');

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomChars = (length) => {
  const bytes = crypto.randomBytes(length);
  let output = '';

  for (const byte of bytes) {
    output += alphabet[byte % alphabet.length];
  }

  return output;
};

const formatSerial = (value) => value.match(/.{1,5}/g).join('-');

const normalizeSerialNumber = (serialNumber) => serialNumber.trim().toUpperCase();

const generateSerialNumber = () => formatSerial(randomChars(25));

const hashSerialNumber = (serialNumber) => {
  if (!security.licenseHashSecret) {
    throw new Error('Falta LICENSE_HASH_SECRET para calcular hashes de licencias.');
  }

  return crypto
    .createHmac('sha256', security.licenseHashSecret)
    .update(normalizeSerialNumber(serialNumber))
    .digest('hex');
};

module.exports = {
  generateSerialNumber,
  hashSerialNumber,
  normalizeSerialNumber,
};
