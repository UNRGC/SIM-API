const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const configPath = require.resolve('../src/config');

const withEnv = (values, fn) => {
  const original = { ...process.env };
  delete require.cache[configPath];

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
    delete require.cache[configPath];
  }
};

test('panel config loads secrets from *_FILE variables', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-panel-config-'));
  const sessionSecretPath = path.join(tempDir, 'panel_session_secret.txt');
  const apiKeyPath = path.join(tempDir, 'admin_api_key.txt');

  fs.writeFileSync(sessionSecretPath, 'panel-session-secret\n');
  fs.writeFileSync(apiKeyPath, 'panel-admin-key\n');

  try {
    withEnv(
      {
        NODE_ENV: 'test',
        PANEL_SESSION_SECRET_FILE: sessionSecretPath,
        SIM_API_ADMIN_KEY_FILE: apiKeyPath,
        SIM_API_BASE_URL: 'http://api.internal:3000',
      },
      () => {
        const config = require('../src/config');
        assert.equal(config.sessionSecret, 'panel-session-secret');
        assert.equal(config.apiAdminKey, 'panel-admin-key');
      }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
