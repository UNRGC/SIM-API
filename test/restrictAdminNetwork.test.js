const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_ALLOWED_IPS = 'loopback';

const {
  isAllowed,
  normalizeIp,
  restrictAdminNetwork,
} = require('../src/middlewares/restrictAdminNetwork');

test('normalizeIp handles IPv4-mapped IPv6 addresses', () => {
  assert.equal(normalizeIp('::ffff:127.0.0.1'), '127.0.0.1');
});

test('isAllowed accepts loopback rules', () => {
  assert.equal(isAllowed('127.0.0.1', ['loopback']), true);
  assert.equal(isAllowed('::1', ['loopback']), true);
});

test('isAllowed accepts IPv4 CIDR rules', () => {
  assert.equal(isAllowed('10.20.30.40', ['10.20.30.0/24']), true);
  assert.equal(isAllowed('10.20.31.40', ['10.20.30.0/24']), false);
});

test('restrictAdminNetwork rejects disallowed admin origins', () => {
  restrictAdminNetwork({ ip: '203.0.113.20' }, {}, (error) => {
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, 'ADMIN_NETWORK_FORBIDDEN');
  });
});
