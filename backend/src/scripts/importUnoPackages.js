/**
 * Import the live hotel-package catalog into this CRM's MongoDB
 * (full itinerary, hotels, cabs, gallery, FAQs, raw API payloads).
 *
 * Run: node src/scripts/importUnoPackages.js
 * Env: SKIP_EXISTING=true  IMPORT_CONCURRENCY=2
 */
require('../config/env');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { importAllUnoPackages } = require('../services/localPackageCatalogService');

async function main() {
  await connectDB();
  const skipExisting = String(process.env.SKIP_EXISTING || '').toLowerCase() === 'true';
  const concurrency = Math.max(1, Number(process.env.IMPORT_CONCURRENCY) || 2);
  console.log(`[packages] starting catalog import skipExisting=${skipExisting} concurrency=${concurrency}`);

  const result = await importAllUnoPackages({ skipExisting, concurrency });
  const summary = {
    running: result.running,
    total: result.total,
    imported: result.imported,
    skipped: result.skipped,
    failed: result.failed,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    errors: (result.errors || []).slice(0, 30),
  };
  console.log('[packages] import complete');
  console.log(JSON.stringify(summary, null, 2));

  if (result.imported === 0 && result.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('[packages] import crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
