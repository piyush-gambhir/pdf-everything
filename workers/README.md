# workers/

Standalone rendering workers. Each subfolder is one worker: a self-contained
service with its own `package.json`, lockfile, Dockerfile, and deploy targets.

| Worker | Does | Runtime |
| --- | --- | --- |
| `html-to-pdf/` | HTML → PDF | headless Chrome (puppeteer-core) |
| `markdown-to-pdf/` | Markdown → HTML → PDF | headless Chrome (puppeteer-core) |

## Why a single `workers/` folder

One folder per worker in one repo, rather than a repo per worker — the workers
share most of their rendering logic and deploy the same way, so keeping them
together makes them far easier to maintain, review, and release consistently.

## Current status: co-located, NOT integrated

These were moved in **as-is** from their former standalone repos. Deliberately:

- **Excluded from the pnpm workspace and Turbo pipeline** (see `pnpm-workspace.yaml`).
  They keep their own dependencies and are built/tested independently.
- **Their nested `.github/workflows/` are inert.** GitHub only reads workflows from
  `.github/workflows/` at the *repository root*. To restore automated Docker Hub
  publishing, those workflows must move to the root, with `context:`/`file:` pointed
  at the worker subfolder and distinct tag triggers per worker (e.g. `html-v*`, `md-v*`).
  The Docker Hub secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`) also need adding
  to this repo.
- **Local deploy scripts still work** — they resolve paths relative to their own
  folder and use your local gcloud/docker credentials, not GitHub.

## Notes

- `markdown-to-pdf/chrome/` (a ~343 MB Chrome for Testing binary) is intentionally
  not committed; it is gitignored and fetched locally when needed.
- Integration idea for later: both workers share the same puppeteer render path
  (`markdown-to-pdf` is really `markdown → HTML → the html-to-pdf renderer`), so a
  common render core is the obvious de-duplication.
