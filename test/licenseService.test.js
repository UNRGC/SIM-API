const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LICENSE_HASH_SECRET = 'test-license-hash-secret';

const { buildValidationResponse } = require('../src/services/licenseService');

test('buildValidationResponse exposes UI-friendly license fields', () => {
  const response = buildValidationResponse({
    valid: true,
    reason: null,
    license: {
      customerName: 'Cliente Demo',
      customerEmail: 'cliente@example.com',
      applicationName: 'SIM Desktop',
      applicationCode: 'SIM-DESKTOP',
      status: 'active',
      validFrom: new Date('2026-06-26T00:00:00.000Z'),
      validUntil: new Date('2027-06-26T00:00:00.000Z'),
    },
  });

  assert.equal(response.valid, true);
  assert.equal(response.ownerName, 'Cliente Demo');
  assert.equal(response.ownerEmail, 'cliente@example.com');
  assert.equal(response.applicationName, 'SIM Desktop');
  assert.equal(response.status, 'valid');
});
