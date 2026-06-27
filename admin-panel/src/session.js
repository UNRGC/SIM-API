const crypto = require('crypto');
const config = require('./config');

const SESSION_COOKIE = 'sim_admin_session';
const CSRF_COOKIE = 'sim_admin_csrf';
const SESSION_PREFIX = 'v1';

const sessions = new Map();

const sign = (value) =>
  crypto.createHmac('sha256', config.sessionSecret).update(value).digest('base64url');

const encodeSessionCookie = (sessionId) => `${SESSION_PREFIX}.${sessionId}.${sign(sessionId)}`;

const decodeSessionCookie = (value) => {
  if (!value) {
    return null;
  }

  const [prefix, sessionId, signature] = value.split('.');
  if (prefix !== SESSION_PREFIX || !sessionId || !signature) {
    return null;
  }

  const expected = sign(sessionId);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  return sessionId;
};

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.cookieSecure,
  path: '/',
};

const csrfCookieOptions = {
  httpOnly: false,
  sameSite: 'strict',
  secure: config.cookieSecure,
  path: '/',
};

const createSession = (res, user) => {
  const now = Date.now();
  const sessionId = crypto.randomBytes(32).toString('base64url');
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = now + config.sessionMinutes * 60 * 1000;

  sessions.set(sessionId, {
    user,
    csrfToken,
    expiresAt,
  });

  res.cookie(SESSION_COOKIE, encodeSessionCookie(sessionId), {
    ...cookieOptions,
    maxAge: config.sessionMinutes * 60 * 1000,
  });
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...csrfCookieOptions,
    maxAge: config.sessionMinutes * 60 * 1000,
  });

  return sessions.get(sessionId);
};

const clearSession = (req, res) => {
  if (req.sessionId) {
    sessions.delete(req.sessionId);
  }

  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.clearCookie(CSRF_COOKIE, csrfCookieOptions);
};

const attachSession = (req, res, next) => {
  const sessionId = decodeSessionCookie(req.cookies?.[SESSION_COOKIE]);
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) {
      sessions.delete(sessionId);
    }

    req.sessionId = null;
    req.session = null;
    return next();
  }

  req.sessionId = sessionId;
  req.session = session;
  req.user = session.user;

  return next();
};

const requireAuth = (req, _res, next) => {
  if (!req.session) {
    const { PanelError } = require('./errors');
    return next(new PanelError('Sesion requerida.', 401, 'AUTH_REQUIRED'));
  }

  return next();
};

const requireCsrf = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const received = req.get('x-csrf-token');
  const expected = req.session?.csrfToken;

  if (!received || !expected) {
    const { PanelError } = require('./errors');
    return next(new PanelError('Token CSRF requerido.', 403, 'CSRF_REQUIRED'));
  }

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    const { PanelError } = require('./errors');
    return next(new PanelError('Token CSRF invalido.', 403, 'CSRF_INVALID'));
  }

  return next();
};

const requirePermission = (permission) => (req, _res, next) => {
  const permissions = req.user?.permissions || [];
  const isAllowed = permissions.includes('*') || permissions.includes(permission);

  if (!isAllowed) {
    const { PanelError } = require('./errors');
    return next(new PanelError('No tienes permisos para esta accion.', 403, 'FORBIDDEN'));
  }

  return next();
};

module.exports = {
  createSession,
  clearSession,
  attachSession,
  requireAuth,
  requireCsrf,
  requirePermission,
};
