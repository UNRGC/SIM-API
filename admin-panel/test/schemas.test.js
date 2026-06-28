const test = require('node:test');
const assert = require('node:assert/strict');

const {
  licenseCreateSchema,
  licenseCertificateSchema,
} = require('../src/schemas');

test('licenseCreateSchema accepts short date values from date inputs', () => {
  const result = licenseCreateSchema.safeParse({
    applicationId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    validFrom: '2026-06-26',
    validUntil: '2027-06-26',
    maxActivations: 1,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.validFrom.toISOString(), '2026-06-26T00:00:00.000Z');
  assert.equal(result.data.validUntil.toISOString(), '2027-06-26T23:59:59.999Z');
});

test('licenseCertificateSchema normalizes full serial number', () => {
  const result = licenseCertificateSchema.safeParse({
    serialNumber: 'abcde-23456-fghjk-789kl-mnpqr',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.serialNumber, 'ABCDE-23456-FGHJK-789KL-MNPQR');
});
