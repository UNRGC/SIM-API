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
const normalizeDeviceId = (deviceId) => deviceId.trim();

const generateSerialNumber = () => formatSerial(randomChars(25));

const hashValue = (value) => {
  if (!security.licenseHashSecret) {
    throw new Error('Falta LICENSE_HASH_SECRET para calcular hashes.');
  }

  return crypto
    .createHmac('sha256', security.licenseHashSecret)
    .update(value)
    .digest('hex');
};

const hashSerialNumber = (serialNumber) => hashValue(normalizeSerialNumber(serialNumber));

const hashDeviceId = (deviceId) => hashValue(normalizeDeviceId(deviceId));

module.exports = {
  generateSerialNumber,
  hashDeviceId,
  hashSerialNumber,
  normalizeDeviceId,
  normalizeSerialNumber,
};
