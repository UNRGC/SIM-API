require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const { rateLimit } = require('express-rate-limit');
const config = require('./src/config');
const logger = require('./src/logger');
const authRoutes = require('./src/routes/authRoutes');
const panelApiRoutes = require('./src/routes/panelApiRoutes');
const { attachSession } = require('./src/session');
const { notFound, errorHandler } = require('./src/errors');

const app = express();

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
  })
);
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());
app.use(attachSession);

app.use(
  '/admin/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiadas solicitudes al panel. Intenta mas tarde.',
      },
    },
  })
);

app.use('/admin/api/auth', authRoutes);
app.use('/admin/api', panelApiRoutes);
app.use('/admin/api', notFound);
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'SIM admin panel listening');
});

const shutdown = (signal) => {
  logger.info({ signal }, 'Shutting down admin panel');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = server;
