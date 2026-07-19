/**
 * Stage a Next static export for a Cloudflare assets Worker.
 *
 * A Worker resolves assets against the REQUEST PATH. With a basePath, the
 * request is /pdf-everything/console/merge/ while `out/` holds merge/ at its
 * root — pointing the Worker straight at `out/` therefore 404s everything.
 *
 * So mirror the basePath as real directories:
 *   out/                     ->  .cloudflare/assets/<base-path>/
 *
 * Usage: node ../scripts/prepare-cloudflare-assets.mjs pdf-everything/console
 */
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const basePath = process.argv[2];

if (!basePath || !/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(basePath)) {
  throw new Error(
    `Expected a URL-safe base path (e.g. "pdf-everything/console"), got: ${basePath ?? '<none>'}`,
  );
}

const source = path.resolve('out');
const destinationRoot = path.resolve('.cloudflare/assets');
const destination = path.join(destinationRoot, basePath);

await rm(destinationRoot, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });

console.log(`[cloudflare] staged out/ -> .cloudflare/assets/${basePath}/`);
