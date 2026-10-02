# Visora

Next.js frontend + Go API. Shipped through Fybud Deploy (not Vercel).

## Deploy

| Service | Domain |
| --- | --- |
| Web | https://visora.fybud.com |
| API | https://api.visora.fybud.com |

- Compose: root [`docker-compose.deploy.yml`](./docker-compose.deploy.yml)
- Playbook: [`DEPLOY.md`](./DEPLOY.md)
- Agent rules: [`AGENTS.md`](./AGENTS.md)

Push to `main` → `.github/workflows/build-push.yml` → Docker Hub `fybud/visora-*` → Deploy webhook.
Paste secrets once in the Deploy UI, then approve.

## Local development

```bash
npm run dev
# or yarn / pnpm / bun
```

Open [http://localhost:3000](http://localhost:3000). See Next.js docs for app-router details.
