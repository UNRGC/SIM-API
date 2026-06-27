const pino = require('pino');
const { app } = require('../config/env');

module.exports = pino({
  level: app.nodeEnv === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.x-api-key',
      'req.headers["x-api-key"]',
      '*.password',
      '*.apiKey',
      '*.adminApiKeys',
      '*.appApiKeys',
    ],
    remove: true,
  },
});
