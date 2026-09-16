import { Client } from 'ssh2';

const HOST = process.env.VPS_HOST || '187.127.188.30';
const PASSWORD = process.env.VPS_PASS;
if (!PASSWORD) {
  console.error('Set VPS_PASS');
  process.exit(1);
}

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(
      [
        'echo ==PORT3000==',
        'ss -tlnp | grep -E ":3000|:27017|:5000" || true',
        'echo ==MONGO_CONF==',
        'grep -E "authorization|security" /etc/mongod.conf | head -20',
        'echo ==MONGO_KEYS==',
        'ls /root | head -30',
        'ls /root/.mongodb 2>/dev/null || true',
        'test -f /root/.mongoshrc.js && echo HAS_MONGOSHRC || echo NO_MONGOSHRC',
        'echo ==ENV_MONGO==',
        "grep -l MONGO_URI /var/www/*/backend/.env /var/www/*/.env /var/www/*/api/.env 2>/dev/null | head -20 || true",
        "ls /var/www/leadmanagement 2>/dev/null | head -20",
        'echo ==IHD_CRM==',
        'ls /var/www/indiaholidaydestination.com 2>/dev/null | head -20',
        'echo ==PM2_SHOW==',
        'pm2 show ihd-crm-api | grep -E "script path|exec cwd|status|port" || true',
      ].join('\n'),
      (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => process.stdout.write(d));
        stream.stderr.on('data', (d) => process.stderr.write(d));
        stream.on('close', (code) => {
          conn.end();
          process.exit(code ?? 0);
        });
      },
    );
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
