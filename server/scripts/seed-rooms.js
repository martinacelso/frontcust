const path = require('node:path');
const { pathToFileURL } = require('node:url');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');

async function seedRooms() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in server/.env.');
  const { ROOM_TYPES } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'src', 'utils', 'catalog.js')).href);
  if (!Array.isArray(ROOM_TYPES) || !ROOM_TYPES.length) throw new Error('The room catalog is empty.');
  const names = new Set();
  // Validate the whole catalog before making changes.
  for (const t of ROOM_TYPES) {
    if (typeof t.n !== 'string' || names.has(t.n.trim().toLowerCase())) throw new Error('Duplicate or invalid catalog name.');
    names.add(t.n.trim().toLowerCase());
    if (!Number.isInteger(t.c) || t.c < 1 || t.c > 100) throw new Error('Invalid room count in catalog.');
    await new RoomType({ name: t.n, rate: t.r, capacity: t.s, description: t.d || '', image: t.img }).validate();
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([RoomType.init(), Room.init()]);
  let typesAdded = 0, roomsAdded = 0, roomNumber = 201;
  for (const t of ROOM_TYPES) {
    const name = t.n.trim();
    const typeResult = await RoomType.updateOne({ name }, { $setOnInsert: {
      name, rate: t.r, capacity: t.s, description: t.d || '', image: t.img, __v: 0,
    } }, { upsert: true, runValidators: true, timestamps: false, collation: { locale: 'en', strength: 2 } });
    typesAdded += typeResult.upsertedCount;
    const type = await RoomType.findOne({ name }).collation({ locale: 'en', strength: 2 });
    for (let n = 0; n < t.c; n++) {
      const number = String(roomNumber++);
      const result = await Room.updateOne({ number }, { $setOnInsert: {
        number, roomType: type._id, status: 'dirty', notes: '', __v: 0,
      } }, { upsert: true, runValidators: true, timestamps: false });
      roomsAdded += result.upsertedCount;
    }
  }
  console.log(`Added ${typesAdded} room types and ${roomsAdded} rooms. Existing records were preserved.`);
  console.log('New rooms are marked dirty pending inspection/cleaning. No bookings or payments were imported.');
}

seedRooms().catch((error) => {
  console.error('Room import failed:', error.name === 'Error' ? error.message : 'Check MongoDB and the room catalog.');
  process.exitCode = 1;
}).finally(async () => { await mongoose.disconnect(); });
