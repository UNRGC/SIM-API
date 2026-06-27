const fs = require('fs');
const argon2 = require('argon2');
const config = require('./config');

let cachedUsers;

const loadUsers = () => {
  if (!cachedUsers) {
    const raw = fs.readFileSync(config.adminUsersFile, 'utf8');
    cachedUsers = JSON.parse(raw);
  }

  return cachedUsers;
};

const sanitizeUser = (user) => ({
  username: user.username,
  displayName: user.displayName || user.username,
  roles: user.roles || [],
  permissions: user.permissions || [],
});

const authenticateUser = async (username, password) => {
  const user = loadUsers().find((candidate) => candidate.username === username);

  if (!user || user.disabled) {
    return null;
  }

  const valid = await argon2.verify(user.passwordHash, password);

  if (!valid) {
    return null;
  }

  return sanitizeUser(user);
};

module.exports = {
  authenticateUser,
};
