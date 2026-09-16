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
        'echo ==MONGOD_CONF==',
        'sed -n "1,120p" /etc/mongod.conf',
        'echo ==ROOT_MONGO_DIR==',
        'ls -la /root/MongoDB /root/mongosh 2>/dev/null | head -40',
        'echo ==ROOT_FILES==',
        'ls -la /root | head -40',
        'echo ==FIND_ADMIN==',
        'ls /root/*.js /root/*.sh /root/*.env /root/.env 2>/dev/null | head -40',
        'echo ==LEAD_ENV_KEYS==',
        "grep -E '^[A-Z_]+=' /var/www/leadmanagement/backend/.env | cut -d= -f1",
        'echo ==LEAD_MONGO_USER==',
        "grep MONGO_URI /var/www/leadmanagement/backend/.env | sed 's#mongodb://\\([^:]*\\):.*#user=\\1#'",
        'echo ==PM2_ENV_SAMPLE==',
        'ls /root/.pm2/dump.pm2 >/dev/null && echo HAS_PM2_DUMP',
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
