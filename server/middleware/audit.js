const Audit = require('../models/Audit');
// Store request outcomes, never request bodies, passwords, cookies or payment details.
module.exports = async function audit(req, res, next) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method) || !/^\/(auth|rooms|bookings|guests|staff|mail)(\/|$)/.test(req.path)) return next();
  const safePath = req.path.replace(/[^a-zA-Z0-9/\-]/g, '').slice(0, 150);
  const actor = req.session?.userId;
  const event = await Audit.create({ action: req.method + ' ' + safePath,
    actorId: typeof actor === 'string' && /^[a-f\d]{24}$/i.test(actor) ? actor : undefined });
  let responseUser;
  const json = res.json;
  res.json = function (body) { if (body?.user?.id) responseUser = body.user; return json.call(this, body); };
  res.once('finish', () => {
    const account = req.account || responseUser;
    const changes = { outcome: res.statusCode < 400 ? 'accepted' : res.statusCode < 500 ? 'denied' : 'error',
      statusCode: res.statusCode, completedAt: new Date() };
    if (account) { changes.actorId = account._id || account.id; changes.role = account.role; }
    Audit.updateOne({ _id: event._id }, { $set: changes }).catch(() => console.error('Audit completion failed; request remains marked started.'));
  });
  // A crash after a write may leave a started entry: the UI calls its outcome unknown.
  next();
};
