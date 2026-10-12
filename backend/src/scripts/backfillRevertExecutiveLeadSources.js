/**
 * Restore lead source to value before sales-executive edits (from lead_edited activity).
 * Run from backend/: node src/scripts/backfillRevertExecutiveLeadSources.js
 * Dry run: DRY_RUN=1 node src/scripts/backfillRevertExecutiveLeadSources.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');
const { sourceFieldsForRestore } = require('../utils/leadSourceEditPolicy');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function pickSourceChange(changes = []) {
  if (!Array.isArray(changes)) return null;
  return changes.find((c) => c && (c.field === 'source' || c.field === 'leadSource'));
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('No MONGODB_URI');

  await mongoose.connect(uri);

  const executives = await User.find({ role: 'sales_executive' }).select('_id name').lean();
  const execIds = executives.map((u) => u._id);
  if (!execIds.length) {
    console.log('EXEC_SOURCE_REVERT no executives found');
    await mongoose.disconnect();
    return;
  }

  const activities = await LeadActivity.find({
    type: 'lead_edited',
    actorId: { $in: execIds },
    'meta.changes.field': { $in: ['source', 'leadSource'] },
  })
    .sort({ createdAt: 1 })
    .select('leadId actorId actorName meta.changes createdAt')
    .lean();

  const revertByLead = new Map();

  for (const row of activities) {
    const change = pickSourceChange(row.meta?.changes);
    if (!change) continue;
    const from = change.oldValue ?? change.from;
    if (from == null || from === '') continue;
    const leadKey = String(row.leadId);
    if (!revertByLead.has(leadKey)) {
      revertByLead.set(leadKey, {
        leadId: row.leadId,
        restoreFrom: from,
        firstEditAt: row.createdAt,
        actorName: row.actorName,
      });
    }
  }

  let matched = 0;
  let modified = 0;
  let skipped = 0;

  for (const entry of revertByLead.values()) {
    const lead = await Lead.findById(entry.leadId).select('source leadSource sourceLabel name').lean();
    if (!lead) {
      skipped += 1;
      continue;
    }

    const patch = sourceFieldsForRestore(entry.restoreFrom);
    const same =
      String(lead.source || '') === String(patch.source || '') &&
      String(lead.leadSource || '') === String(patch.leadSource || '');

    matched += 1;
    if (same) {
      skipped += 1;
      continue;
    }

    console.log(
      `${DRY_RUN ? '[dry-run] ' : ''}Lead ${lead.name || lead._id}: ${lead.source || lead.leadSource} → ${patch.source} (exec edit ${entry.firstEditAt?.toISOString?.() || ''})`
    );

    if (!DRY_RUN) {
      await Lead.updateOne({ _id: lead._id }, { $set: patch });
    }
    modified += 1;
  }

  console.log(
    `EXEC_SOURCE_REVERT activities=${activities.length} leads=${revertByLead.size} matched=${matched} modified=${modified} skipped=${skipped} dryRun=${DRY_RUN}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
