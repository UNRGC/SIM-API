const app = require('./app');
const { app: appConfig } = require('./config/env');
const logger = require('./utils/logger');
const { closePool } = require('./db/postgres');

const server = app.listen(appConfig.port, () => {
  logger.info({ port: appConfig.port }, 'Licensing API listening');
});

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = server;
