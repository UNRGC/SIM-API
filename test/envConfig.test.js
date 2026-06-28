const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
      ADMIN_ALLOWED_IPS: '',
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

test('env config loads secrets from *_FILE variables', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-api-env-'));
  const adminKeysPath = path.join(tempDir, 'admin_api_keys.txt');
  const licenseSecretPath = path.join(tempDir, 'license_hash_secret.txt');

  fs.writeFileSync(adminKeysPath, 'admin-key-from-file\n');
  fs.writeFileSync(licenseSecretPath, 'license-secret-from-file\n');

  try {
    withEnv(
      {
        NODE_ENV: 'test',
        ADMIN_API_KEYS_FILE: adminKeysPath,
        LICENSE_HASH_SECRET_FILE: licenseSecretPath,
      },
      () => {
        const { security } = require('../src/config/env');
        assert.deepEqual(security.adminApiKeys, ['admin-key-from-file']);
        assert.equal(security.licenseHashSecret, 'license-secret-from-file');
      }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
