const User = require('../models/User');

async function authenticated(req, res, next) {
  try {
    const id = req.session?.userId;
    const user = typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)
      ? await User.findById(id).select('+passwordHash') : null;
    if (!user || !user.active || (req.session.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      if (req.session) {
        await new Promise((resolve, reject) => req.session.destroy((err) => err ? reject(err) : resolve()));
      }
      res.clearCookie('frontcust.sid', { path: '/' });
      return res.status(401).json({ error: 'Please sign in again.' });
    }
    // Never return this document directly: it includes the password hash.
    req.account = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.account) return res.status(401).json({ error: 'Please sign in.' });
    if (!roles.includes(req.account.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

module.exports = { authenticated, requireRoles };
