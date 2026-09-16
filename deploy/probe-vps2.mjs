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
        'echo ==CERTBOT==',
        'certbot --version 2>/dev/null || echo NO_CERTBOT',
        'echo ==PM2==',
        'pm2 list',
        'echo ==WWW==',
        'ls /var/www',
        'echo ==HIMJOURNEY_LANDING==',
        'ls /etc/nginx/sites-available | grep -i him || true',
        'echo ==SAMPLE_NGINX==',
        'cat /etc/nginx/sites-available/crm.exploremybharat.info 2>/dev/null | head -80 || true',
        'echo ==MONGO_DBS==',
        "mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name).join(\"\\n\")'",
        'echo ==UFW==',
        'ufw status 2>/dev/null | head -20 || true',
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
