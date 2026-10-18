const mongoose = require('mongoose');
function failure(status, message) { const error = new Error(message); error.status = status; return error; }
async function transaction(work) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session), {
      readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary',
    });
  } catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation') {
      throw failure(503, 'Booking changes require MongoDB replica-set transaction support. Ask the administrator to finish database setup.');
    }
    throw error;
  } finally { await session.endSession(); }
}
module.exports = { transaction, failure };
