# pdf-everything console

Static Next.js client for all nineteen public PDF API operations.

The console contains presentation and request-building code only. It does not
import PDF or Chromium runtimes; every workflow calls the Nest API gateway.

## Development

From the repository root:

```bash
pnpm --filter @pdf-everything/console dev
```

Open:

```text
http://localhost:3000/pdf-everything/console/
```

The local defaults are:

```dotenv
NEXT_PUBLIC_API_ORIGIN=http://localhost:3001
NEXT_PUBLIC_SITE_ORIGIN=http://localhost:3002
```

`NEXT_PUBLIC_SITE_ORIGIN` is used for the website and documentation links.
Production can omit it when the site and console share one origin.

## Production build

```bash
NEXT_PUBLIC_API_ORIGIN=https://api.example.com \
NEXT_PUBLIC_SITE_ORIGIN=https://example.com \
pnpm --filter @pdf-everything/console build
```

The static export is mounted at `/pdf-everything/console/`.

See the product [documentation](../web/content/docs/index.mdx) and
[deployment guide](../web/content/docs/deployment.mdx).
