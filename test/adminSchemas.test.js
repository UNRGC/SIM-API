const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createApplicationSchema,
  listApplicationsSchema,
} = require('../src/schemas/applicationSchemas');
const {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
} = require('../src/schemas/customerSchemas');

test('createApplicationSchema normalizes application code', () => {
  const result = createApplicationSchema.safeParse({
    name: 'SIM Desktop',
    code: 'sim-desktop',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.code, 'SIM-DESKTOP');
  assert.equal(result.data.isActive, true);
});

test('listApplicationsSchema parses boolean query values explicitly', () => {
  const result = listApplicationsSchema.safeParse({
    isActive: 'false',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.isActive, false);
});

test('createCustomerSchema accepts fiscal administration fields', () => {
  const result = createCustomerSchema.safeParse({
    externalRef: 'demo-customer',
    name: 'Cliente Demo',
    email: 'cliente@example.com',
    rfc: 'xaxx010101000',
    fiscalRegime: 'General de Ley Personas Morales',
    postalCode: '64000',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.rfc, 'XAXX010101000');
  assert.equal(result.data.isActive, true);
});

test('updateCustomerSchema allows clearing optional fiscal fields', () => {
  const result = updateCustomerSchema.safeParse({
    fiscalRegime: null,
    postalCode: null,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.fiscalRegime, null);
});

test('listCustomersSchema parses boolean query values explicitly', () => {
  const result = listCustomersSchema.safeParse({
    isActive: '0',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.isActive, false);
});
