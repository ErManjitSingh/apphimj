#!/usr/bin/env bash
set -euo pipefail

APP=/var/www/crm.himjourneytours.in
ENV_FILE="$APP/backend/.env"

echo "== env files =="
chmod 600 "$APP/.env" "$APP/backend/.env"
mkdir -p "$APP/backend/uploads" /var/www/certbot

PASS=$(python3 - <<'PY'
import re
from pathlib import Path
t = Path("/var/www/crm.himjourneytours.in/backend/.env").read_text()
m = re.search(r"MONGO_URI=mongodb://crm_app:([^@]+)@", t)
if not m:
    raise SystemExit("MONGO_URI not found")
print(m.group(1))
PY
)

echo "== mongodb user crm_app =="
cp -a /etc/mongod.conf /etc/mongod.conf.bak.himj
python3 - <<'PY'
from pathlib import Path
p = Path("/etc/mongod.conf")
t = p.read_text()
if "authorization: enabled" not in t:
    raise SystemExit("expected authorization: enabled")
p.write_text(t.replace("authorization: enabled", "authorization: disabled", 1))
PY
systemctl restart mongod
sleep 5
systemctl is-active mongod

mongosh --quiet --eval "
const pdb = db.getSiblingDB('crm_himjourneytours');
try { pdb.dropUser('crm_app'); } catch (e) {}
pdb.createUser({
  user: 'crm_app',
  pwd: '${PASS}',
  roles: [{ role: 'readWrite', db: 'crm_himjourneytours' }]
});
print('created crm_app');
"

python3 - <<'PY'
from pathlib import Path
p = Path("/etc/mongod.conf")
t = p.read_text()
p.write_text(t.replace("authorization: disabled", "authorization: enabled", 1))
PY
systemctl restart mongod
sleep 5
systemctl is-active mongod

mongosh "mongodb://crm_app:${PASS}@127.0.0.1:27017/crm_himjourneytours?authSource=crm_himjourneytours" --quiet --eval 'printjson(db.runCommand({ping:1}))'

echo "== npm backend =="
cd "$APP/backend"
if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

echo "== vapid =="
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const wp = require('web-push');
const files = [
  path.join('/var/www/crm.himjourneytours.in/backend/.env'),
  path.join('/var/www/crm.himjourneytours.in/.env'),
];
const keys = wp.generateVAPIDKeys();
for (const file of files) {
  let t = fs.readFileSync(file, 'utf8');
  t = t.replace(/^VAPID_PUBLIC_KEY=.*$/m, 'VAPID_PUBLIC_KEY=' + keys.publicKey);
  t = t.replace(/^VAPID_PRIVATE_KEY=.*$/m, 'VAPID_PRIVATE_KEY=' + keys.privateKey);
  fs.writeFileSync(file, t);
}
console.log('vapid keys written');
NODE

echo "== npm frontend =="
cd "$APP/frontend"
if [ -f package-lock.json ]; then npm ci; else npm install; fi
NODE_OPTIONS=--max-old-space-size=2048 npm run build
test -f dist/index.html

echo "== nginx =="
cp "$APP/deploy/nginx/crm.himjourneytours.in.conf" /etc/nginx/sites-available/crm.himjourneytours.in
ln -sfn /etc/nginx/sites-available/crm.himjourneytours.in /etc/nginx/sites-enabled/crm.himjourneytours.in
nginx -t
systemctl reload nginx

echo "== seed =="
cd "$APP/backend"
NODE_ENV=production npm run seed

echo "== pm2 =="
pm2 delete himjourney-crm-api >/dev/null 2>&1 || true
pm2 start "$APP/deploy/ecosystem.config.cjs"
pm2 save

echo "== ssl =="
certbot --nginx -d crm.himjourneytours.in --non-interactive --agree-tos -m bookinghimjourneytours@gmail.com --redirect || echo "CERTBOT_FAILED"

sleep 2
echo "== health =="
curl -sS http://127.0.0.1:3000/api/health || true
echo
curl -sS -I http://crm.himjourneytours.in | head -20 || true
echo
pm2 describe himjourney-crm-api | sed -n '1,40p'
echo DONE
