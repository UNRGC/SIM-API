const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { authenticateUser } = require('../users');
const { createSession, clearSession, requireAuth, requireCsrf } = require('../session');
const { validate, loginSchema } = require('../schemas');
const { PanelError } = require('../errors');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'LOGIN_RATE_LIMITED',
      message: 'Demasiados intentos de inicio de sesion. Intenta mas tarde.',
    },
  },
});

router.get('/me', (req, res) => {
  res.status(200).json({
    data: {
      authenticated: Boolean(req.session),
      user: req.user || null,
      csrfToken: req.session?.csrfToken || null,
    },
  });
});

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const user = await authenticateUser(req.body.username, req.body.password);

    if (!user) {
      throw new PanelError('Usuario o password invalidos.', 401, 'INVALID_CREDENTIALS');
    }

    const session = createSession(res, user);
    res.status(200).json({
      data: {
        user,
        csrfToken: session.csrfToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, requireCsrf, (req, res) => {
  clearSession(req, res);
  res.status(204).send();
});

module.exports = router;
