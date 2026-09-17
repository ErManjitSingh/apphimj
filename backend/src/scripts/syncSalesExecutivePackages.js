/**
 * Sync Role.permissions.packages for sales_executive so create/edit stick.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Role = require('../models/Role');
const { ROLE_PERMISSIONS } = require('../config/permissions');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI missing');
  await mongoose.connect(uri);

  const slug = 'sales_executive';
  const next = ROLE_PERMISSIONS[slug];
  const role = await Role.findOne({ slug });
  if (!role) {
    console.log(JSON.stringify({ ok: false, message: 'role not found', slug }));
  } else {
    role.permissions = {
      ...(role.permissions?.toObject?.() || role.permissions || {}),
      packages: next.packages,
    };
    await role.save();
    console.log(JSON.stringify({ ok: true, slug, packages: role.permissions.packages }));
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
