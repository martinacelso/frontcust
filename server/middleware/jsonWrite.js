const { timingSafeEqual } = require('node:crypto');
module.exports = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'GET') return next();
  const sent = req.get('X-CSRF-Token'), expected = req.session?.csrfToken;
  if (!sent || !expected || Buffer.byteLength(sent) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(sent), Buffer.from(expected))) return res.status(403).json({ error: 'Refresh and try again.' });
  if (!req.is('application/json')) return res.status(415).json({ error: 'Send JSON.' });
  next();
};
