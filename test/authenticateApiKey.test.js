const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_API_KEYS = 'admin-key';
process.env.APP_API_KEYS = 'app-key';

const authenticateApiKey = require('../src/middlewares/authenticateApiKey');

const createReq = (apiKey) => ({
  get(headerName) {
    return headerName.toLowerCase() === 'x-api-key' ? apiKey : undefined;
  },
});

test('authenticateApiKey accepts admin keys for admin routes', () => {
  const middleware = authenticateApiKey(['admin']);
  const req = createReq('admin-key');

  middleware(req, {}, (error) => {
    assert.equal(error, undefined);
    assert.equal(req.auth.isAdmin, true);
  });
});

test('authenticateApiKey rejects app keys for admin routes', () => {
  const middleware = authenticateApiKey(['admin']);
  const req = createReq('app-key');

  middleware(req, {}, (error) => {
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, 'UNAUTHORIZED');
  });
});

test('authenticateApiKey accepts app keys for validation routes', () => {
  const middleware = authenticateApiKey(['admin', 'app']);
  const req = createReq('app-key');

  middleware(req, {}, (error) => {
    assert.equal(error, undefined);
    assert.equal(req.auth.isApp, true);
  });
});
