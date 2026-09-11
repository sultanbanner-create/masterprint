const crypto = require('crypto');
const store = require('../data/store');

// Active sessions memory map: token -> { userId, role, expiresAt }
const sessions = new Map();

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    userId: user.id,
    name: user.name,
    role: user.role,
    permissions: user.permissions || [],
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  sessions.set(token, session);
  return token;
}

function verifySession(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function requireRole(allowedRoles = ['admin']) {
  return (req, res, next) => {
    // Check session
    const session = verifySession(req);
    const userRole = session ? session.role : req.headers['x-user-role'];

    if (!userRole) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    if (allowedRoles.includes('*') || allowedRoles.includes(userRole) || userRole === 'admin') {
      req.session = session;
      return next();
    }

    return res.status(403).json({ error: 'Доступ запрещён: недостаточно прав' });
  };
}

module.exports = {
  createSession,
  verifySession,
  requireRole,
  sessions
};
