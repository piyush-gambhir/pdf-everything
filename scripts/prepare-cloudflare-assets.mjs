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
