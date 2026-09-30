# Visora tenant stacks (FiberAI Deploy)

Image-only Compose. Shared Postgres = `fiberai-postgres` on `fiberai-net`.

| Folder | Domains | DB |
|---|---|---|
| `demo/` | `visora.fybud.com`, `api.visora.fybud.com` | `visora-demo` |

GitHub Actions: `.github/workflows/build-push.yml` → `fiberai/visora-api`, `fiberai/visora-web`.
