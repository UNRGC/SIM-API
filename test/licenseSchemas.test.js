const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createLicenseSchema,
  validateLicenseSchema,
  listLicensesSchema,
} = require('../src/schemas/licenseSchemas');

test('createLicenseSchema accepts custom validity windows', () => {
  const result = createLicenseSchema.safeParse({
    applicationId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    validFrom: '2026-06-26T00:00:00.000Z',
    validUntil: '2027-06-26T00:00:00.000Z',
    maxActivations: 3,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.maxActivations, 3);
});

test('createLicenseSchema accepts short date values', () => {
  const result = createLicenseSchema.safeParse({
    applicationId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    validFrom: '2026-06-26',
    validUntil: '2027-06-26',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.validFrom.toISOString(), '2026-06-26T00:00:00.000Z');
  assert.equal(result.data.validUntil.toISOString(), '2027-06-26T23:59:59.999Z');
});

test('createLicenseSchema accepts customer data instead of customerId', () => {
  const result = createLicenseSchema.safeParse({
    applicationId: '11111111-1111-4111-8111-111111111111',
    customer: {
      externalRef: 'demo-customer',
      name: 'Cliente Demo',
      email: 'cliente@example.com',
      rfc: 'xaxx010101000',
      fiscalRegime: 'General de Ley Personas Morales',
      postalCode: '64000',
    },
    validUntil: '2027-06-26T00:00:00.000Z',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.customer.rfc, 'XAXX010101000');
});

test('createLicenseSchema requires customerId or customer, but not both', () => {
  const missingCustomer = createLicenseSchema.safeParse({
    applicationId: '11111111-1111-4111-8111-111111111111',
    validUntil: '2027-06-26T00:00:00.000Z',
  });

  const duplicateCustomer = createLicenseSchema.safeParse({
    applicationId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    customer: {
      name: 'Cliente Demo',
    },
    validUntil: '2027-06-26T00:00:00.000Z',
  });

  assert.equal(missingCustomer.success, false);
  assert.equal(duplicateCustomer.success, false);
});

test('createLicenseSchema rejects invalid validity windows', () => {
  const result = createLicenseSchema.safeParse({
    applicationId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    validFrom: '2027-06-26T00:00:00.000Z',
    validUntil: '2026-06-26T00:00:00.000Z',
  });

  assert.equal(result.success, false);
});

test('validateLicenseSchema enforces serial number format', () => {
  const result = validateLicenseSchema.safeParse({
    serialNumber: 'ABCDE-23456-FGHJK-789KL-MNPQR',
  });

  assert.equal(result.success, true);
});

test('listLicensesSchema coerces pagination defaults', () => {
  const result = listLicensesSchema.safeParse({});

  assert.equal(result.success, true);
  assert.equal(result.data.limit, 25);
  assert.equal(result.data.offset, 0);
});
