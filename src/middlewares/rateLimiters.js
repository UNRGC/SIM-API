const { ipKeyGenerator, rateLimit } = require('express-rate-limit');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Demasiadas solicitudes administrativas. Intenta mas tarde.',
    },
  },
});

const validationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.get('x-api-key') || 'anonymous'}`,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Demasiadas validaciones de licencia. Intenta mas tarde.',
    },
  },
});

module.exports = {
  adminLimiter,
  validationLimiter,
};
