const pino = require('pino');

module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.x-csrf-token',
      '*.password',
      '*.passwordHash',
      '*.sessionSecret',
      '*.apiAdminKey',
      '*.csrfToken',
      '*.sessionId',
    ],
    remove: true,
  },
});
