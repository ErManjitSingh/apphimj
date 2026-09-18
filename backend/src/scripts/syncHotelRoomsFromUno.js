/**
 * Sync full room categories + images from Uno Hotels API into local Hotel docs.
 * Run from backend folder: node src/scripts/syncHotelRoomsFromUno.js
 */
require('../config/env');
const mongoose = require('mongoose');
const { mongoUri } = require('../config/env');
const { syncHotelRoomsFromUno } = require('../services/localHotelCatalogService');

async function main() {
  const onlyThin = String(process.env.ONLY_THIN || 'false') === 'true';
  const limit = Number(process.env.LIMIT || 0);
  await mongoose.connect(mongoUri);
  console.log('[syncHotelRooms] connected', { onlyThin, limit });
  const result = await syncHotelRoomsFromUno({ onlyThin, limit });
  console.log('[syncHotelRooms] done', JSON.stringify(result));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[syncHotelRooms] failed', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
