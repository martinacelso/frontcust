const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
async function check() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  console.log('Database connection: OK');
  if (hello.setName || hello.msg === 'isdbgrid') {
    console.log('Transaction-capable topology: YES');
    console.log('The booking backend can be installed. A live booking test is still required.');
  } else {
    console.log('Transaction-capable topology: NO (standalone MongoDB)');
    console.log('Keep the current server files for now. Configure a replica set before installing the booking backend.');
  }
  console.log('No records or database settings were changed.');
}
check().catch(() => { console.error('Unable to check database. Check MongoDB and server/.env.'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
