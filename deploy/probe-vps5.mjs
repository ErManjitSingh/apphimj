import { Client } from 'ssh2';

const HOST = process.env.VPS_HOST || '187.127.188.30';
const PASSWORD = process.env.VPS_PASS;
if (!PASSWORD) {
  console.error('Set VPS_PASS');
  process.exit(1);
}

const remote = `
set -e
echo ==HISTORY==
grep -iE 'mongo|createUser' /root/.bash_history | sed -E 's#(mongodb://[^:]+:)[^@]+@#\\1***@#g; s#(pwd:[[:space:]]*["'"'"']?)[^"'"'"',}]+#\\1***#g' | tail -50 || true
echo ==DOT_MONGODB==
ls -la /root/.mongodb || true
echo ==REDIS==
ss -tlnp | grep 6379 || echo no_6379
echo ==MONGO_URI_FILES==
grep -rl 'MONGO_URI' /var/www --include='.env' --include='*.env' 2>/dev/null | head -20
echo ==CRMAPP_STATUS==
URI=$(grep -E '^MONGO_URI=' /var/www/leadmanagement/backend/.env | cut -d= -f2-)
mongosh "$URI" --quiet --eval 'printjson(db.runCommand({connectionStatus:1}))'
echo ==CRMAPP_LISTUSERS==
mongosh "$URI" --quiet --eval 'try { printjson(db.getUsers()) } catch(e) { print("no_getUsers "+e.message) }'
echo ==CRMAPP_ADMIN==
mongosh "$URI" --quiet --eval 'try { printjson(db.adminCommand({listDatabases:1}).databases.map(d=>d.name)) } catch(e) { print("no_listdb "+e.message) }'
`.trim();

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(remote, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) => {
        conn.end();
        process.exit(code ?? 0);
      });
    });
  })
  .on('error', (err) => {
    console.error(err.message);
    process.exit(1);
  })
  .connect({
    host: HOST,
    port: 22,
    username: 'root',
    password: PASSWORD,
    readyTimeout: 30000,
    hostVerifier: () => true,
  });
