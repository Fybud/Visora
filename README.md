# Visora

Next.js frontend + Go API. Shipped through Fybud Deploy (not Vercel).

## Live URLs

| Service | Domain |
| --- | --- |
| Web | https://visora.fybud.com |
| API | https://api.visora.fybud.com |

## Deploy

| File | Role |
| --- | --- |
| [`docker-compose.deploy.yml`](./docker-compose.deploy.yml) | Runtime contract Deploy downloads |
| [`.env.deploy`](./.env.deploy) | Paste into Deploy UI → Environment → **Raw** (gitignored) |
| [`DEPLOY.md`](./DEPLOY.md) | Org playbook |
| [`AGENTS.md`](./AGENTS.md) | Agent contract |

Push `main` → Actions → `fybud/visora-*` → Deploy webhook → compose up → nginx → TLS.

### What you paste vs what Deploy fills

**Paste** the entire [`.env.deploy`](./.env.deploy) into Deploy → Visora → Environment → Raw → Save & Redeploy.

Every app variable is declared **empty** in `docker-compose.deploy.yml` and comes from that paste — including `DATABASE_URL`, `FRONTEND_URL`, `API_BASE_EXTERNAL`, `COOKIE_DOMAIN`, `GIN_MODE`, `PORT`, `WEB_PORT`, `API_BASE_URL`, GEO/crawl knobs, etc.

**Deploy only injects:**

| Variable | Why |
| --- | --- |
| `API_HOST_PORT` / `WEB_HOST_PORT` | Free host ports for nginx → `127.0.0.1:<host>:<container>` |
| `IMAGE_TAG` | Image tag from the build/webhook |

Container ports in the compose `ports:` lines (`:8080` / `:3000`) are Docker mapping targets — they must match pasted `PORT=8080` and `WEB_PORT=3000`. They are not env vars.

`NEXT_PUBLIC_*` are baked into the web image at CI build time — do not paste them for runtime.

### `DATABASE_URL` (checked on Save / Save & Redeploy / approve / deploy)

Must be:

```env
DATABASE_URL=postgresql://postgres:postgres@fybud-postgres:5432/visora
```

- User **postgres**, password **postgres** — otherwise Deploy returns **400** and refuses to save  
- DB name from the URL path — created automatically if missing  

### Auth

`COOKIE_DOMAIN=fybud.com` so the JWT on `api.visora.fybud.com` is readable by `visora.fybud.com`.

Google redirect URI: `https://api.visora.fybud.com/auth/google/callback`

### Ports in `.env.deploy`

```env
PORT=8080
WEB_PORT=3000
API_BASE_URL=http://api-server:8080/api
```

`WEB_PORT` is used because one shared `.env` cannot set two different `PORT` values; the frontend container maps `WEB_PORT` → `PORT` at start.
