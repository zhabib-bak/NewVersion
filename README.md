# 🚀 Ticket Tracker Enterprise

**Enterprise-grade operational ticket tracker** built with **Node.js 22** and premium dark theme. Single-process, single-file server backed by MySQL with a sophisticated SPA frontend featuring glass-morphism design and advanced visualizations.

## ✨ Premium Features

| Area | Enterprise Features |
|---|---|
| **🎨 Premium UI** | Glass-morphism dark theme · Advanced animations · Micro-interactions · Enterprise-grade design |
| **🔐 Security** | Password login · scrypt hashing · No account lockout · Forced password reset · HttpOnly+SameSite cookies · CSRF tokens |
| **👥 RBAC** | Three roles: `user` < `manager` < `admin` — Universal access to core features · Admin-only roles management |
| **🎫 Tickets** | Create · edit · status workflow · priority · SLA tracking · aging · due dates · Advanced search |
| **📊 Dashboards** | ApexCharts interactive visualizations · Professional analytics · Real-time data · Premium charts |
| **🔍 Search** | Advanced multi-criteria search · Full-text search · Filter combinations · Saved views |
| **📥 Bulk Import** | 4-step CSV wizard · Column mapping · Preview · Results · Auto-detect 50+ headers |
| **📎 Attachments** | File uploads (JPEG, PNG, PDF, CSV, TXT — 8MB max) · Download · Delete |
| **📧 Email** | SMTP notifications · STARTTLS · Direct TLS · Configurable |
| **🎯 Kanban** | Drag-and-drop board · Live status columns · Visual workflow |
| **🌐 Webhooks** | HMAC-SHA256 signing · HTTPS-only · SSRF protection · Delivery history |
| **📋 Audit Trail** | Immutable security and data change logging |
| **🚀 Performance** | Connection pooling · Optimized queries · Caching ready · Enterprise scaling |

## Requirements

- **Node.js 22+**
- **MySQL database server** (tested with MySQL 8.0)
- **mysql2 npm package** (automatically installed)

## Quick start

```bash
cp .env.example .env          # customise as needed
npm start                     # http://localhost:3000
```

Default credentials (all accounts):
- **Username:** `Jawad` (admin) or any seed user
- **Password:** value of `TICKET_APP_DEFAULT_PASSWORD` (default `ChangeMe!2026`)

All seed accounts are marked for forced password reset on first login.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Set `production` on live servers |
| `DATA_DIR` | `./data` | Directory for secrets and uploads |
| `SESSION_DURATION_HOURS` | `12` | Session lifetime |
| `TICKET_APP_DEFAULT_PASSWORD` | `ChangeMe!2026` | Initial password for seeded accounts |
| `WEBHOOK_TIMEOUT_MS` | `5000` | Webhook delivery timeout |
| `WEBHOOK_ALLOWLIST` | _(empty = all)_ | Comma-separated allowed webhook hostnames |
| `SMTP_HOST` | _(empty = disabled)_ | SMTP server — leave blank to disable email |
| `SMTP_PORT` | `587` | SMTP port (587 = STARTTLS, 465 = TLS) |
| `SMTP_USER` | | SMTP username |
| `SMTP_PASS` | | SMTP password |
| `SMTP_FROM` | `Ticket Tracker <no-reply@localhost>` | From address |
| `SMTP_SECURE` | `false` | `true` for direct TLS (port 465) |
| `SMTP_REJECT_UNAUTHORIZED` | `true` | Set `false` only for self-signed certs |
| `DB_HOST` | `localhost` | MySQL database host |
| `DB_PORT` | `3306` | MySQL database port |
| `DB_NAME` | `ticket_tracker` | MySQL database name |
| `DB_USER` | `root` | MySQL database user |
| `DB_PASS` | | MySQL database password |

## Deploy

### Docker

```bash
docker build -t ticket-tracker .
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  --name ticket-tracker \
  ticket-tracker
```

**Note:** When using Docker, ensure your MySQL database is accessible from the container. You may need to use the database server's IP address instead of `localhost` for `DB_HOST`.

### Railway / Render / Fly.io

The repo includes a `Procfile`. Push to your platform — the `npm start` command is all that's needed.

```bash
# Railway
railway up

# Fly.io
fly launch   # generates fly.toml automatically
fly deploy
```

Set all env vars from `.env.example` in the platform's dashboard. Mount a persistent volume at `/app/data`.

### Bare VPS (systemd)

```bash
# Install Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and configure
git clone https://github.com/zhabib-bak/Ticket.git /opt/ticket
cd /opt/ticket && cp .env.example .env && nano .env

# systemd service
sudo tee /etc/systemd/system/ticket.service <<EOF
[Unit]
Description=Ticket Tracker
After=network.target

[Service]
WorkingDirectory=/opt/ticket
ExecStart=/usr/bin/node server.mjs
Restart=always
User=www-data
EnvironmentFile=/opt/ticket/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now ticket
```

Reverse-proxy with Nginx or Caddy to add HTTPS.

### nginx reverse proxy snippet

```nginx
server {
    listen 443 ssl;
    server_name tickets.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Smoke test

Spawns a real server on a temporary port, runs 6 API checks, tears everything down:

```bash
npm test
```

## Data persistence

- SQLite database: `$DATA_DIR/tickets.db`
- File attachments: `$DATA_DIR/uploads/`
- App secrets (encryption key): `$DATA_DIR/.app-secrets.json`

Back these up. The `data/` directory is gitignored.

## Security notes

- Run behind HTTPS in production (`NODE_ENV=production` tightens cookie flags)
- The default seed password must be changed — accounts are locked for reset on first login
- `WEBHOOK_ALLOWLIST` prevents outbound SSRF from webhook deliveries
- SMTP cert validation is on by default (`SMTP_REJECT_UNAUTHORIZED=true`)
