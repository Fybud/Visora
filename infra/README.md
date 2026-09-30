# Visora tenant stacks (fybud Deploy)

Image-only Compose. Shared Postgres = `fybud-postgres` on `fybud-net`.

| Folder  | Domains                                    | DB            |
| ------- | ------------------------------------------ | ------------- |
| `demo/` | `visora.fybud.com`, `api.visora.fybud.com` | `visora-demo` |

GitHub Actions: `.github/workflows/build-push.yml` → `fybud/visora-api`, `fybud/visora-web`.
