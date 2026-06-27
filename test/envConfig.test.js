const test = require('node:test');
const assert = require('node:assert/strict');

const envPath = require.resolve('../src/config/env');

const withEnv = (values, fn) => {
  const original = { ...process.env };
  delete require.cache[envPath];

  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, original, values);

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    }
  });

  try {
    return fn();
  } finally {
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, original);
    delete require.cache[envPath];
  }
};

test('env config requires ADMIN_ALLOWED_IPS in production', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      ADMIN_ALLOWED_IPS: undefined,
    },
    () => {
      assert.throws(() => require('../src/config/env'), /ADMIN_ALLOWED_IPS/);
    }
  );
});

test('env config defaults admin allowlist to loopback outside production', () => {
  withEnv(
    {
      NODE_ENV: 'test',
      ADMIN_ALLOWED_IPS: undefined,
    },
    () => {
      const { security } = require('../src/config/env');
      assert.deepEqual(security.adminAllowedIps, ['loopback']);
    }
  );
});
