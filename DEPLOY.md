# Deploying to your subdomain (e.g. invoice.yourdomain.com)

The app is a Next.js server with a SQLite file database (`data/invoices.db`).
It needs a server that keeps files — a normal Linux VPS is perfect.
**Do not deploy to Vercel/serverless** without first migrating the database.

## 1. DNS

At your domain registrar / DNS panel, add an **A record**:

```
invoice.yourdomain.com  →  <your VPS IP>
```

## 2. Prepare the app on the VPS

Copy the project to the server (git clone or scp — remember `.env` is NOT in
git, copy it separately), then create `.env` from `.env.example`:

```bash
cp .env.example .env
nano .env
```

Required for production:

- `AUTH_SECRET` — long random string:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `AUTH_ADMIN_USER` / `AUTH_ADMIN_PASSWORD` — the first admin login
  (created automatically on first run; add teammates from the Users page)
- The `NEXT_PUBLIC_*` invoice defaults (signer, bank accounts)

## 3a. Run with Docker (recommended)

```bash
docker build -t sfl-invoice .
docker run -d --name sfl-invoice \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /srv/sfl-invoice-data:/app/data \
  --env-file .env \
  sfl-invoice
```

The `-v` volume keeps `invoices.db` safe across container rebuilds.

## 3b. Or run with Node + PM2 (no Docker)

```bash
# Node 20+ required
npm ci
npm run build
npm i -g pm2
pm2 start npm --name sfl-invoice -- start
pm2 save && pm2 startup
```

## 4. nginx reverse proxy + HTTPS

`/etc/nginx/sites-available/sfl-invoice`:

```nginx
server {
    listen 80;
    server_name invoice.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/sfl-invoice /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# free HTTPS certificate (required — login cookies are Secure in production)
apt install certbot python3-certbot-nginx
certbot --nginx -d invoice.yourdomain.com
```

## 5. First login

Open https://invoice.yourdomain.com → you'll be redirected to `/login`.
Sign in with `AUTH_ADMIN_USER` / `AUTH_ADMIN_PASSWORD`, then open **Users**
and create accounts for your team. Change the admin password by removing and
re-adding, or keep it only for management.

## Backups

Everything lives in one file: `data/invoices.db` (plus `-wal`/`-shm`
sidecars). Cron a daily copy somewhere safe:

```bash
0 2 * * * sqlite3 /srv/sfl-invoice-data/invoices.db ".backup /backups/invoices-$(date +\%F).db"
```

## Updating the app

```bash
git pull            # or copy new files
docker build -t sfl-invoice . && docker rm -f sfl-invoice && <run command above>
# or: npm ci && npm run build && pm2 restart sfl-invoice
```
