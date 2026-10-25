import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Compare immutable published tags, or use "local" for the reviewed Node 26 images.
const [beforeTag, afterTag] = process.argv.slice(2);
if (!beforeTag || !afterTag) {
  throw new Error(
    'Usage: node scripts/benchmark-pdf.mjs <before-image-tag> <after-image-tag|local>',
  );
}
const require = createRequire(resolve('workers/pdf-core-worker/package.json'));
const { PDFDocument, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const scope = 'ghcr.io/piyush-gambhir/';
const names = {
  api: 'pdf-everything-api',
  core: 'pdf-everything-pdf-core-worker',
  renderer: 'pdf-everything-pdf-worker',
};
const local = {
  api: 'pdf-everything-api:node26-final',
  core: 'pdf-core-worker:node26-final',
  renderer: 'pdf-worker:node26-final',
};
const token = 'disposable-benchmark-token';
const containers = [];
const networks = [];
const docker = (args) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const WARMUPS = 5;
const SAMPLES = 30;
const stacks = {};
async function ready(origin, path) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin + path, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Readiness failed: ${origin}${path}`);
}
async function start(label, tag) {
  const network = `pdf-benchmark-${process.pid}-${label}`;
  docker(['network', 'create', network]);
  networks.push(network);
  const result = { images: {}, origins: {} };
  for (const role of ['core', 'renderer', 'api']) {
    const image = tag === 'local' ? local[role] : `${scope}${names[role]}:${tag}`;
    const name = `${network}-${role}`;
    const port = role === 'core' ? 8020 : role === 'renderer' ? 8010 : 3001;
    const env =
      role === 'api'
        ? {
            API_PORT: String(port),
            STORAGE_DIR: '/app/storage',
            PDF_CORE_WORKER_URL: `http://${network}-core:8020`,
            PDF_RENDER_WORKER_URL: `http://${network}-renderer:8010`,
            PDF_CORE_WORKER_TOKEN: token,
            PDF_RENDER_WORKER_TOKEN: token,
          }
        : role === 'core'
          ? { PORT: String(port), WORKER_API_TOKEN: token }
          : { PORT: String(port), API_TOKEN: token, RENDER_TIMING_LOG: 'off' };
    docker([
      'run',
      '--detach',
      '--rm',
      '--init',
      '--name',
      name,
      '--network',
      network,
      '--cpus=2',
      '--memory=1g',
      '--publish',
      `127.0.0.1::${port}`,
      ...Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
      image,
    ]);
    containers.push(name);
    const info = JSON.parse(docker(['inspect', name]))[0];
    result.images[role] = {
      reference: image,
      id: info.Image,
      node: docker(['exec', name, 'node', '--version']),
    };
    result.origins[role] =
      `http://127.0.0.1:${info.NetworkSettings.Ports[`${port}/tcp`][0].HostPort}`;
  }
  result.images.renderer.chromium = docker([
    'exec',
    `${network}-renderer`,
    'chromium',
    '--version',
  ]);
  await Promise.all(
    Object.entries(result.origins).map(([role, origin]) =>
      ready(origin, role === 'api' ? '/api/health' : '/ready'),
    ),
  );
  return result;
}
async function makePdf(pages) {
  const doc = await PDFDocument.create();
  doc.setCreationDate(new Date('2026-01-01T00:00:00Z'));
  doc.setModificationDate(new Date('2026-01-01T00:00:00Z'));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 1; index <= pages; index++) {
    const page = doc.addPage([595, 842]);
    for (let line = 0; line < 30; line++)
      page.drawText(`Page ${index}, line ${line}: PDF processing benchmark 0123456789`, {
        x: 40,
        y: 790 - line * 22,
        size: 10,
        font,
      });
  }
  return new Uint8Array(await doc.save());
}
function multipart(files, options, multiple = false, mime = 'application/pdf') {
  return () => {
    const body = new FormData();
    files.forEach((file, index) =>
      body.append(
        multiple ? 'files' : 'file',
        new Blob([file], { type: mime }),
        `input-${index}.${mime === 'image/jpeg' ? 'jpg' : 'pdf'}`,
      ),
    );
    body.append('options', JSON.stringify(options));
    return { method: 'POST', body };
  };
}
function json(body) {
  return () => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function percentile(values, p) {
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
}
const report = {
  createdAt: new Date().toISOString(),
  host: { platform: process.platform, architecture: process.arch },
  resources: { cpusPerContainer: 2, memoryPerContainer: '1 GiB', concurrency: 1 },
  methodology: {
    warmups: WARMUPS,
    samples: SAMPLES,
    order: 'alternating before/after within each workload',
    timing:
      'HTTP request through gateway to full response bytes, excludes FormData construction and output validation',
    fixtures: 'synthetic text PDFs and deterministic noisy JPEGs; not a production document corpus',
  },
  stacks,
  fixtures: {},
  workloads: [],
};
try {
  stacks.before = await start('before', beforeTag);
  stacks.after = await start('after', afterTag);
  console.log(`Ready: ${stacks.before.images.api.node} versus ${stacks.after.images.api.node}`);
  const [pdf20, pdf100] = await Promise.all([makePdf(20), makePdf(100)]);
  const pixels = Buffer.alloc(1200 * 900 * 3);
  let seed = 42;
  for (let i = 0; i < pixels.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    pixels[i] = seed >>> 24;
  }
  const jpeg = await sharp(pixels, { raw: { width: 1200, height: 900, channels: 3 } })
    .jpeg({ quality: 80 })
    .toBuffer();
  for (const [name, bytes] of Object.entries({ pdf20, pdf100, jpeg }))
    report.fixtures[name] = {
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  const html =
    '<!DOCTYPE html><html><head><style>@page{size:A4;margin:20mm}section{break-after:page}section:last-child{break-after:auto}</style></head><body>' +
    Array.from(
      { length: 10 },
      (_, i) =>
        `<section><h1>Benchmark page ${i + 1}</h1>${'<p>Self-contained document rendering with no network resources.</p>'.repeat(12)}</section>`,
    ).join('') +
    '</body></html>';
  const markdown = Array.from(
    { length: 30 },
    (_, i) =>
      `## Section ${i + 1}\n\n` +
      'PDF processing benchmark with headings, tables and text.\n\n'.repeat(8) +
      '| Column A | Column B |\n| --- | --- |\n| Value | 123 |\n',
  ).join('\n');
  const workloads = [
    {
      name: 'Merge 10 PDFs (200 pages)',
      route: 'organize/merge',
      request: multipart(Array(10).fill(pdf20), {}, true),
      pages: 200,
    },
    {
      name: 'Split 100 pages into 10 files',
      route: 'organize/split',
      request: multipart([pdf100], {
        mode: 'ranges',
        ranges: Array.from({ length: 10 }, (_, i) => `${i * 10 + 1}-${i * 10 + 10}`),
      }),
      kind: 'split',
    },
    {
      name: 'Rotate 100 pages',
      route: 'organize/rotate',
      request: multipart([pdf100], { angle: 90 }),
      pages: 100,
      rotation: 90,
    },
    {
      name: 'Watermark 100 pages',
      route: 'edit/watermark',
      request: multipart([pdf100], { text: 'BENCHMARK', fontSize: 30, rotation: 0 }),
      pages: 100,
    },
    {
      name: 'Extract text from 100 pages',
      route: 'convert-from/extract-text',
      request: multipart([pdf100], {}),
      kind: 'text',
    },
    {
      name: 'Convert 4 JPEGs (1200x900) to PDF',
      route: 'convert-to/images-to-pdf',
      request: multipart(Array(4).fill(jpeg), {}, true, 'image/jpeg'),
      pages: 4,
    },
    { name: 'Render HTML (10 pages)', route: 'render/html', request: json({ html }), pages: 10 },
    {
      name: 'Render Markdown (30 sections)',
      route: 'render/markdown',
      request: json({ markdown, template: 'github' }),
    },
  ];
  async function run(label, workload, validate) {
    const options = workload.request();
    const before = performance.now();
    const response = await fetch(`${stacks[label].origins.api}/api/v1/${workload.route}`, {
      ...options,
      signal: AbortSignal.timeout(60000),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const ms = performance.now() - before;
    assert.equal(
      response.status,
      200,
      `${label} ${workload.name}: ${response.status} ${Buffer.from(bytes).toString().slice(0, 400)}`,
    );
    if (validate) {
      if (workload.kind === 'text') {
        const text = Buffer.from(bytes).toString();
        assert.ok(text.includes('Page 1, line 0') && text.includes('Page 100, line 29'));
      } else if (workload.kind === 'split') {
        const result = JSON.parse(Buffer.from(bytes).toString());
        assert.equal(result.files.length, 10);
        const download = await fetch(
          `${stacks[label].origins.api}/api/v1/files/${result.files[0].id}/content`,
        );
        assert.equal((await PDFDocument.load(await download.arrayBuffer())).getPageCount(), 10);
      } else {
        const doc = await PDFDocument.load(bytes);
        if (workload.pages) assert.equal(doc.getPageCount(), workload.pages);
        if (workload.rotation)
          assert.ok(doc.getPages().every((p) => p.getRotation().angle === workload.rotation));
      }
    }
    // Split outputs are persistent references. Delete benchmark data outside timing.
    if (workload.kind === 'split') {
      const result = JSON.parse(Buffer.from(bytes).toString());
      for (const file of result.files) {
        const deleted = await fetch(`${stacks[label].origins.api}/api/v1/files/${file.id}`, {
          method: 'DELETE',
        });
        assert.equal(deleted.status, 204);
      }
    }
    return ms;
  }
  for (const workload of workloads) {
    const samples = { before: [], after: [] };
    for (let round = 0; round < WARMUPS + SAMPLES; round++) {
      for (const label of round % 2 ? ['after', 'before'] : ['before', 'after']) {
        const ms = await run(label, workload, round === 0);
        if (round >= WARMUPS) samples[label].push(ms);
      }
    }
    const beforeMedianMs = percentile(samples.before, 0.5);
    const afterMedianMs = percentile(samples.after, 0.5);
    const result = {
      name: workload.name,
      beforeMedianMs,
      afterMedianMs,
      medianLatencyReductionPercent: (1 - afterMedianMs / beforeMedianMs) * 100,
      beforeP95Ms: percentile(samples.before, 0.95),
      afterP95Ms: percentile(samples.after, 0.95),
      samples,
    };
    report.workloads.push(result);
    console.log(
      `${result.name}: ${beforeMedianMs.toFixed(1)} -> ${afterMedianMs.toFixed(1)} ms (${result.medianLatencyReductionPercent.toFixed(1)}% latency reduction)`,
    );
  }
  await writeFile(
    resolve('.git/pdf-processing-benchmark.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log('Samples and image IDs: .git/pdf-processing-benchmark.json');
} finally {
  for (const name of containers.reverse()) {
    try {
      docker(['stop', '--timeout', '3', name]);
    } catch {}
  }
  for (const network of networks.reverse()) {
    try {
      docker(['network', 'rm', network]);
    } catch {}
  }
}
