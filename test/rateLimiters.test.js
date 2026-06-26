const test = require('node:test');
const assert = require('node:assert/strict');

const { validationKeyGenerator } = require('../src/middlewares/rateLimiters');

const createReq = (ip, apiKey) => ({
  ip,
  get(headerName) {
    return headerName.toLowerCase() === 'x-api-key' ? apiKey : undefined;
  },
});

test('validationKeyGenerator ignores client-controlled API key values', () => {
  const first = validationKeyGenerator(createReq('203.0.113.10', 'app-key-a'));
  const second = validationKeyGenerator(createReq('203.0.113.10', 'app-key-b'));
  const anonymous = validationKeyGenerator(createReq('203.0.113.10'));

  assert.equal(first, second);
  assert.equal(first, anonymous);
});

test('validationKeyGenerator keeps different IPs in separate buckets', () => {
  const first = validationKeyGenerator(createReq('203.0.113.10', 'app-key'));
  const second = validationKeyGenerator(createReq('203.0.113.11', 'app-key'));

  assert.notEqual(first, second);
});
