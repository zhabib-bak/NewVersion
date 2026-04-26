# Control Room — Ticket Tracker

A self-hosted operational ticket tracker built with **Node.js 22** and zero npm dependencies. Single-process, single-file server backed by SQLite. Ships with a full-featured SPA frontend.

## Features

| Area | What's included |
|---|---|
| **Auth** | Password login · scrypt hashing · brute-force lockout · forced password reset · HttpOnly+SameSite cookies · CSRF tokens |
| **RBAC** | Three roles: `user` < `manager` < `admin` — enforced on every endpoint |
| **Tickets** | Create · edit · status workflow · priority · SLA tracking · aging · due dates |
| **Bulk import** | 4-step CSV wizard (upload → column mapping → preview → results) · auto-detects 50+ header aliases · partial success · per-row errors · rollback |
| **Pagination** | Server-side 50 rows/page with Prev/Next controls |
| **Attachments** | Per-ticket file uploads (JPEG, PNG, PDF, CSV, TXT — max 8 MB) · download · delete |
| **Email** | SMTP notifications on ticket assignment and status change · STARTTLS + direct TLS · opt-in via env vars |
| **Kanban** | Drag-and-drop board with live status columns |
| **Dashboards** | Summary cards · trend charts · priority/assignee/category breakdowns |
| **Saved views** | Persist filter combinations as named chips |
| **Webhooks** | Outgoing webhooks with HMAC-SHA256 signing · HTTPS-only · SSRF protection · delivery history |
| **Audit trail** | Immutable log of every security and data change |
| **CI** | GitHub Actions: syntax check + 6-check smoke test on every push |

## Requirements

- **Node.js 22+** (uses `node:sqlite` built-in — experimental in 22, stable in 23+)
- No other runtime dependencies

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
| `DATA_DIR` | `./data` | Directory for SQLite DB and secrets |
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
