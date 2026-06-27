const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'saqartour-dev-secret-change-in-production';

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || req.ip
    || 'unknown';
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...user } = row;
  const { verification_code, verification_expires, ...safe } = user;
  return {
    ...safe,
    verified_email: !!user.verified_email,
    two_factor_enabled: !!user.two_factor_enabled,
    account_type: user.account_type || 'traveler'
  };
}

module.exports = { getClientIp, signToken, authRequired, adminRequired, sanitizeUser, JWT_SECRET };