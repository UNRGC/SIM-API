const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.PANEL_SESSION_SECRET = 'test-session-secret-with-enough-length';
process.env.SIM_API_BASE_URL = 'http://localhost:3000';
process.env.SIM_API_ADMIN_KEY = 'test-admin-key';

const {
  createSession,
  attachSession,
  requirePermission,
} = require('../src/session');

const createResponse = () => ({
  cookies: {},
  cookie(name, value) {
    this.cookies[name] = value;
  },
  clearCookie(name) {
    delete this.cookies[name];
  },
});

test('createSession stores signed session and csrf cookies', () => {
  const res = createResponse();
  const session = createSession(res, {
    username: 'admin',
    permissions: ['*'],
  });

  assert.equal(typeof res.cookies.sim_admin_session, 'string');
  assert.equal(res.cookies.sim_admin_csrf, session.csrfToken);
});

test('attachSession restores valid sessions from cookies', () => {
  const res = createResponse();
  createSession(res, {
    username: 'admin',
    permissions: ['*'],
  });

  const req = {
    cookies: {
      sim_admin_session: res.cookies.sim_admin_session,
    },
  };

  attachSession(req, {}, () => {});

  assert.equal(req.user.username, 'admin');
});

test('requirePermission rejects missing permissions', () => {
  const req = {
    user: {
      permissions: ['applications:read'],
    },
  };
  const middleware = requirePermission('licenses:write');

  middleware(req, {}, (error) => {
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, 'FORBIDDEN');
  });
});
