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
        'echo ==OS==',
        'uname -a',
        'cat /etc/os-release | head -6',
        'echo ==NODE==',
        'node -v 2>/dev/null || echo NO_NODE',
        'npm -v 2>/dev/null || echo NO_NPM',
        'pm2 -v 2>/dev/null || echo NO_PM2',
        'echo ==NGINX==',
        'nginx -v 2>&1 || echo NO_NGINX',
        'echo ==MONGO==',
        'mongod --version 2>/dev/null | head -1 || mongosh --version 2>/dev/null || echo NO_MONGO',
        'systemctl is-active mongod 2>/dev/null || systemctl is-active mongodb 2>/dev/null || echo mongo_inactive',
        'echo ==DISK==',
        'df -h / | tail -1',
        'echo ==DIR==',
        'ls -ld /var/www 2>/dev/null || echo NO_WWW',
        'echo ==NGINX_SITES==',
        'ls /etc/nginx/sites-enabled 2>/dev/null || true',
      ].join(' && '),
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
