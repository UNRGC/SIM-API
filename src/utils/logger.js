const pino = require('pino');
const { app } = require('../config/env');

module.exports = pino({
  level: app.nodeEnv === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
    remove: true,
  },
});
