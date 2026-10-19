const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
function connectionHint(error) {
  const code = error?.cause?.code || error?.code;
  if (error.name === 'MongoParseError') return 'Check that MONGODB_URI is a complete Atlas connection string with all placeholders replaced.';
  if (code === 18 || code === 8000 || error.codeName === 'AuthenticationFailed' || error.codeName === 'AtlasError') {
    return 'Atlas rejected the connection. Check that the database user exists in Database Access, the username and password in server/.env match, and special characters in the password are URL-encoded. Also confirm your current IP is allowed in Network Access.';
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'Check the Atlas hostname and your internet/DNS connection.';
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED') return 'Check Atlas Network Access and allow your current IP address.';
  if (error.name === 'MongoServerSelectionError') return 'Check the Atlas URI, internet connection, cluster status, and Network Access IP allowlist.';
  return 'Check the Atlas URI, database credentials, cluster status, and Network Access IP allowlist.';
}
async function check() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  console.log('Database connection: OK');
  if (hello.setName || hello.msg === 'isdbgrid') {
    console.log('Transaction-capable topology: YES');
    console.log('The booking backend can be installed. A live booking test is still required.');
  } else {
    console.error('Transaction-capable topology: NO (standalone MongoDB)');
    console.error('Booking and room changes require MongoDB Atlas or another replica-set deployment. Check MONGODB_URI in server/.env.');
    process.exitCode = 1;
  }
  console.log('No records or database settings were changed.');
}
check().catch((error) => {
  if (error.message === 'MONGODB_URI is missing.') console.error(error.message);
  else console.error(`Unable to check database (${error.name}${error.code ? `, code ${error.code}` : ''}). ${connectionHint(error)}`);
  process.exitCode = 1;
})
  .finally(() => mongoose.disconnect());
