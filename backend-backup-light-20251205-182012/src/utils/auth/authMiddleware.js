const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !==2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'invalid auth header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // attach user object (id and role)
    req.user = { id: payload.id, role: payload.role };
    // optionally load user data from DB
    if (req.db) {
      const user = await req.db('users').where({ id: payload.id }).first();
      if (user) {
        req.user.email = user.email;
      }
    }
    next();
  } catch (e) {
    console.warn('auth error', e.message);
    return res.status(401).json({ error: 'invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'admin required' });
  return next();
}

module.exports = { authenticate, requireAdmin };