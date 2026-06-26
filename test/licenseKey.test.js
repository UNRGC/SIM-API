const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LICENSE_HASH_SECRET = 'test-license-hash-secret';

const {
  generateSerialNumber,
  hashSerialNumber,
  normalizeSerialNumber,
} = require('../src/utils/licenseKey');

test('generateSerialNumber creates formatted serials with safe characters', () => {
  const serialNumber = generateSerialNumber();

  assert.match(serialNumber, /^[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){4}$/);
});

test('hashSerialNumber is stable after normalization', () => {
  const first = hashSerialNumber('abcde-23456-fghij-789kl-mnpqr');
  const second = hashSerialNumber(' ABCDE-23456-FGHIJ-789KL-MNPQR ');

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test('normalizeSerialNumber trims and uppercases values', () => {
  assert.equal(normalizeSerialNumber(' abc-123 '), 'ABC-123');
});
