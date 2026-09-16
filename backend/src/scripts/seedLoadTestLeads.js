/**
 * Seed bulk leads for API / UI speed testing.
 * Run: npm run seed:load-test-leads
 * Options:
 *   --count=1000   Number of leads (default 1000)
 *   --clear        Remove existing load_test leads first
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Lead = require('../models/Lead');

const CHANNEL = 'load_test';
const BATCH_SIZE = 250;
const DEFAULT_COUNT = 1000;

const DESTINATIONS = [
  'Manali', 'Goa', 'Dubai', 'Kerala', 'Shimla', 'Rajasthan', 'Thailand',
  'Bali', 'Kashmir', 'Andaman', 'Ladakh', 'Singapore', 'Maldives', 'Europe',
];

const SOURCES = ['website', 'whatsapp', 'phone', 'referral', 'google_ads', 'facebook_ads'];
const CITIES = ['Delhi', 'Mumbai', 'Chandigarh', 'Jaipur', 'Bangalore', 'Pune', 'Ahmedabad'];

function parseArgs() {
  const args = process.argv.slice(2);
  let count = Number(process.env.LEAD_LOAD_TEST_COUNT) || DEFAULT_COUNT;
  let clear = false;

  for (const arg of args) {
    if (arg === '--clear') clear = true;
    else if (arg.startsWith('--count=')) count = Number(arg.split('=')[1]);
  }

  if (!Number.isFinite(count) || count < 1) {
    throw new Error('Invalid --count value');
  }

  return { count: Math.min(Math.floor(count), 10000), clear };
}

function buildLeadDoc(index, { branchId, createdBy, baseTs }) {
  const i = index + 1;
  const createdAt = new Date(baseTs - index * 60_000);

  return {
    leadId: `LT-${String(i).padStart(5, '0')}`,
    name: `Speed Test Lead ${i}`,
    email: `loadtest${i}@speedtest.local`,
    phone: `+9198000${String(10000 + i).padStart(5, '0')}`,
    destination: DESTINATIONS[index % DESTINATIONS.length],
    city: CITIES[index % CITIES.length],
    budget: 20000 + (index % 25) * 4000,
    budgetRange: 'custom',
    status: 'new',
    source: SOURCES[index % SOURCES.length],
    travelers: 2 + (index % 5),
    adults: 2 + (index % 3),
    children: index % 3,
    branchId,
    createdBy,
    channel: CHANNEL,
    leadType: index % 7 === 0 ? 'group' : 'fit',
    leadTypeSource: 'auto',
    leadScore: ['low', 'medium', 'high', 'hot'][index % 4],
    temperature: ['cold', 'warm', 'hot', 'vip'][index % 4],
    isHot: index % 11 === 0,
    createdAt,
    updatedAt: createdAt,
  };
}

async function seedLoadTestLeads() {
  const { count, clear } = parseArgs();
  const started = Date.now();

  await connectDB();

  const [admin, branch] = await Promise.all([
    User.findOne({ role: 'admin', status: { $ne: 'disabled' } }).select('_id name').lean(),
    Branch.findOne({ status: 'active' }).sort({ createdAt: 1 }).select('_id name').lean(),
  ]);

  if (!admin) {
    throw new Error('No admin user found. Run npm run seed first.');
  }
  if (!branch) {
    throw new Error('No active branch found.');
  }

  if (clear) {
    const removed = await Lead.deleteMany({ channel: CHANNEL });
    console.log(`Cleared ${removed.deletedCount} existing load_test lead(s).`);
  }

  const existing = await Lead.countDocuments({ channel: CHANNEL });
  if (existing >= count) {
    console.log(`Already have ${existing} load_test leads (target ${count}). Use --clear to re-seed.`);
    await mongoose.disconnect();
    return;
  }

  const toCreate = count - existing;
  const baseTs = Date.now();
  const context = { branchId: branch._id, createdBy: admin._id, baseTs };

  console.log(`Seeding ${toCreate} load_test leads for branch "${branch.name}"…`);

  let inserted = 0;
  for (let offset = 0; offset < toCreate; offset += BATCH_SIZE) {
    const batchCount = Math.min(BATCH_SIZE, toCreate - offset);
    const docs = Array.from({ length: batchCount }, (_, j) =>
      buildLeadDoc(existing + offset + j, context)
    );
    const result = await Lead.insertMany(docs, { ordered: false });
    inserted += result.length;
    process.stdout.write(`  inserted ${inserted}/${toCreate}\r`);
  }

  const total = await Lead.countDocuments({ channel: CHANNEL });
  const elapsed = ((Date.now() - started) / 1000).toFixed(2);

  console.log(`\nDone. ${inserted} lead(s) added in ${elapsed}s. Total load_test leads: ${total}.`);
  console.log('Filter in CRM: channel=load_test or search "Speed Test Lead".');
  console.log('Clear later: npm run clear:load-test-leads');

  await mongoose.disconnect();
}

seedLoadTestLeads().catch((err) => {
  console.error(err);
  process.exit(1);
});
