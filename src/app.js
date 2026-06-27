const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { app: appConfig } = require('./config/env');
const logger = require('./utils/logger');
const licenseRoutes = require('./routes/licenseRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const customerRoutes = require('./routes/customerRoutes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

if (appConfig.trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (appConfig.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origen no permitido por CORS.'));
    },
  })
);
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/licenses', licenseRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
