import { execSync } from 'child_process';
import fs from 'fs';

const dest = 'backend/src/config/ensureIndexes.js';
let source = execSync('git show HEAD:backend/src/config/ensureIndexes.js', { encoding: 'utf8' });
source = source.replace(/\r\n/g, '\n');

const helper = `async function safeIndex(collection, spec, options) {
  try {
    await collection.createIndex(spec, options);
  } catch (err) {
    const conflict =
      err.code === 85 ||
      err.code === 86 ||
      /same name as the requested index/i.test(err.message);
    if (!conflict) throw err;
    const name =
      options?.name ||
      Object.entries(spec)
        .map(([key, value]) => \`\${key}_\${value}\`)
        .join('_');
    await collection.dropIndex(name).catch(() => {});
    await collection.createIndex(spec, options);
  }
}

`;

source = source.replace(
  'async function ensureIndexes() {\n  await Promise.all([\n',
  `${helper}async function ensureIndexes() {\n  await Promise.all([\n`,
);
source = source.replace(
  /(\w+)\.collection\.createIndex\(/g,
  'safeIndex($1.collection, ',
);

if (source.includes('safeIndex(.collection')) {
  throw new Error('replacement failed');
}
if (!source.includes('safeIndex(Lead.collection')) {
  throw new Error('Lead indexes not wrapped');
}

fs.writeFileSync(dest, source);
const count = (source.match(/safeIndex\(/g) || []).length;
console.log('wrote', dest, 'safeIndex calls', count);
