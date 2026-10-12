/**
 * One-off: parse FB notes into externalFormCapture for existing Meta leads.
 * node src/scripts/backfillMetaFormCapture.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

function parseNotesToCapture(notes = '') {
  const text = String(notes || '').trim();
  if (!text.includes('FB Leadgen:')) return null;

  const answers = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('FB ') || t.startsWith('NOTE:') || t.startsWith('WARNING:') || t.startsWith('Landing:')) {
      continue;
    }
    const idx = t.indexOf(':');
    if (idx <= 0) continue;
    const label = t.slice(0, idx).trim();
    const value = t.slice(idx + 1).trim();
    if (label && value) answers.push({ key: label, label, value });
  }

  return {
    provider: 'facebook_leadgen',
    leadgenId: (text.match(/FB Leadgen:\s*(\S+)/) || [])[1] || '',
    campaignName: (text.match(/FB Campaign:\s*(.+)/) || [])[1]?.trim() || '',
    adsetName: (text.match(/FB Adset:\s*(.+)/) || [])[1]?.trim() || '',
    adName: (text.match(/FB Ad:\s*(.+)/) || [])[1]?.trim() || '',
    formName: (text.match(/FB Form:\s*(.+)/) || [])[1]?.trim() || '',
    formId: (text.match(/FB Form ID:\s*(\S+)/) || [])[1] || '',
    adId: (text.match(/FB Ad ID:\s*(\S+)/) || [])[1] || '',
    pageId: (text.match(/FB Page:\s*(\S+)/) || [])[1] || '',
    answers,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const leads = await Lead.find({
    isDeleted: { $ne: true },
    notes: /FB Leadgen:/,
    $or: [
      { externalFormCapture: { $exists: false } },
      { 'externalFormCapture.answers.0': { $exists: false } },
    ],
  })
    .select('_id leadId notes')
    .lean();

  let updated = 0;
  for (const lead of leads) {
    const capture = parseNotesToCapture(lead.notes);
    if (!capture?.answers?.length && !capture?.leadgenId) continue;
    await Lead.updateOne({ _id: lead._id }, { $set: { externalFormCapture: capture } });
    updated += 1;
    console.log('OK', lead.leadId || lead._id);
  }
  console.log('Done. Updated', updated);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
