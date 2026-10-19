const MailJob = require('../models/MailJob'), Booking = require('../models/Booking');
function startMailWorker() {
  if (process.env.MAIL_MODE !== 'smtp') return;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.MAIL_FROM) throw new Error('SMTP settings are incomplete. Use MAIL_MODE=preview until configured.');
  const port = Number(process.env.SMTP_PORT || 587);
  if (![465, 587].includes(port)) throw new Error('Use SMTP_PORT=465 or 587.');
  const transport = require('nodemailer').createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465,
    requireTLS: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    disableFileAccess: true, disableUrlAccess: true });
  let busy = false;
  async function tick() {
    if (busy) return; busy = true;
    try {
      await MailJob.updateMany({ status: 'sending', lockedAt: { $lt: new Date(Date.now() - 300000) } },
        { $set: { status: 'failed', lastError: 'Delivery outcome unknown after interruption. Check the mailbox before retrying.' } });
      const job = await MailJob.findOneAndUpdate({ status: 'pending', attempts: { $lt: 5 } },
        { $set: { status: 'sending', lockedAt: new Date() }, $inc: { attempts: 1 } }, { sort: { createdAt: 1 }, returnDocument: 'after' });
      if (!job) return;
      try {
        const booking = await Booking.findById(job.booking).select('status');
        if (!booking || (job.kind === 'confirmation' && booking.status === 'cancelled')) {
          await MailJob.updateOne({ _id: job._id, status: 'sending' }, { $set: { status: 'cancelled' } }); return;
        }
        const sent = await transport.sendMail({ from: process.env.MAIL_FROM, to: job.to, subject: job.subject, text: job.text,
          messageId: `<${job._id}@frontcust.local>` });
        if (!sent.accepted?.length) throw new Error('not accepted');
        await MailJob.updateOne({ _id: job._id, status: 'sending' }, { $set: { status: 'sent', sentAt: new Date(), lastError: '' } });
      } catch {
        await MailJob.updateOne({ _id: job._id, status: 'sending' }, { $set: { status: 'failed', lastError: 'Delivery could not be confirmed. Check the mailbox and SMTP settings before retrying.' } });
      }
    } catch { console.error('Email worker could not update the outbox.'); }
    finally { busy = false; }
  }
  const timer = setInterval(tick, 10000); timer.unref();
}
module.exports = { startMailWorker };
