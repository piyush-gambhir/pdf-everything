import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(root, 'workers/pdf-core-worker/package.json'));
const { PDFDocument, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const { getDocument } = await import(
  pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'))
);
// Keep verification documents separate from application storage.
const storage = await mkdtemp(resolve(root, '.verification-'));
const children = [];
const events = [];
async function freePort() {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
const [corePort, renderPort] = await Promise.all([freePort(), freePort()]);
const apiPort = await freePort();
const origin = `http://127.0.0.1:${apiPort}`;
const token = 'local-verification-only';
function start(name, entry, env) {
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (data) => {
    log += data;
  });
  child.stderr.on('data', (data) => {
    log += data;
  });
  child.on('exit', (code, signal) => {
    if (code && !signal) console.error(`${name} exited ${code}: ${log}`);
  });
  children.push(child);
  return child;
}
async function stop() {
  for (const child of children) child.kill('SIGTERM');
  await Promise.all(
    children.map((child) =>
      child.exitCode !== null ? undefined : new Promise((r) => child.once('exit', r)),
    ),
  );
}
process.once('SIGTERM', () => {
  void stop().then(() => process.exit(0));
});
process.once('SIGINT', () => {
  void stop().then(() => process.exit(130));
});
async function ready(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Not ready: ${url}`);
}
async function request(path, { expected = 200, ...options } = {}) {
  const response = await fetch(`${origin}/api/v1/${path}`, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status,
    expected,
    `${path}: ${response.status} ${response.ok ? '' : await response.clone().text()}`,
  );
  return response;
}
async function multipart(path, input, options = {}, field = 'file') {
  const body = new FormData();
  for (const [index, data] of input.entries())
    body.append(field, new Blob([data], { type: 'application/pdf' }), `input-${index}.pdf`);
  body.append('options', JSON.stringify(options));
  return request(path, { method: 'POST', body });
}
async function pdf(response) {
  assert.match(response.headers.get('content-type'), /application\/pdf/);
  return PDFDocument.load(await response.arrayBuffer());
}
async function texts(bytes) {
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  try {
    const doc = await task.promise;
    const result = [];
    for (let page = 1; page <= doc.numPages; page++) {
      const content = await (await doc.getPage(page)).getTextContent();
      result.push(
        content.items
          .filter((i) => 'str' in i)
          .map((i) => i.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
    }
    return result;
  } finally {
    await task.destroy();
  }
}
async function check(name, run) {
  await run();
  events.push(name);
  console.log(`PASS ${name}`);
}
try {
  start('core', 'workers/pdf-core-worker/dist/http/index.js', {
    PORT: String(corePort),
    WORKER_API_TOKEN: token,
  });
  start('renderer', 'workers/pdf-worker/dist/deploy/docker/index.js', {
    PORT: String(renderPort),
    API_TOKEN: token,
    RENDER_TIMING_LOG: 'off',
  });
  start('gateway', 'backend/dist/main.js', {
    API_PORT: String(apiPort),
    STORAGE_DIR: storage,
    PDF_CORE_WORKER_URL: `http://127.0.0.1:${corePort}`,
    PDF_RENDER_WORKER_URL: `http://127.0.0.1:${renderPort}`,
    PDF_CORE_WORKER_TOKEN: token,
    PDF_RENDER_WORKER_TOKEN: token,
  });
  await Promise.all([
    ready(`${origin}/api/health`),
    ready(`http://127.0.0.1:${corePort}/ready`),
    ready(`http://127.0.0.1:${renderPort}/ready`),
  ]);
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.Helvetica);
  for (let page = 1; page <= 3; page++)
    source.addPage([400, 600]).drawText(`PAGE${page}`, { x: 40, y: 500, font });
  const input = await source.save();
  await check('merge: multipart transport and page order', async () => {
    const response = await multipart(
      'organize/merge',
      [input, input],
      { outputFilename: 'joined.pdf' },
      'files',
    );
    assert.match(response.headers.get('content-disposition'), /joined.pdf/);
    assert.deepEqual(await texts(await response.arrayBuffer()), [
      'PAGE1',
      'PAGE2',
      'PAGE3',
      'PAGE1',
      'PAGE2',
      'PAGE3',
    ]);
  });
  await check('split: stored outputs and content downloads', async () => {
    const result = await (
      await multipart('organize/split', [input], { mode: 'ranges', ranges: ['1,3', '2'] })
    ).json();
    assert.equal(result.files.length, 2);
    for (const [index, expected] of [['PAGE1', 'PAGE3'], ['PAGE2']].entries()) {
      assert.deepEqual(
        await texts(await (await request(`files/${result.files[index].id}/content`)).arrayBuffer()),
        expected,
      );
    }
  });
  await check('rotate: selected page only', async () => {
    const doc = await pdf(await multipart('organize/rotate', [input], { angle: 90, pages: '2' }));
    assert.deepEqual(
      doc.getPages().map((p) => p.getRotation().angle),
      [0, 90, 0],
    );
  });
  for (const [route, options, expected] of [
    ['remove-pages', { pages: '2' }, ['PAGE1', 'PAGE3']],
    ['extract-pages', { pages: '1,3' }, ['PAGE1', 'PAGE3']],
    ['reorder', { order: [3, 1, 2] }, ['PAGE3', 'PAGE1', 'PAGE2']],
  ])
    await check(`${route}: correct page content`, async () =>
      assert.deepEqual(
        await texts(await (await multipart(`organize/${route}`, [input], options)).arrayBuffer()),
        expected,
      ),
    );
  await check('crop: resulting crop box', async () => {
    const doc = await pdf(
      await multipart('organize/crop', [input], {
        marginPoints: { top: 10, right: 20, bottom: 30, left: 40 },
      }),
    );
    assert.deepEqual(doc.getPage(0).getCropBox(), { x: 40, y: 30, width: 340, height: 560 });
  });
  for (const [route, options, expected] of [
    ['watermark', { text: 'CONFIDENTIAL', rotation: 0, fontSize: 16 }, 'CONFIDENTIAL'],
    ['page-numbers', { format: 'page_n_of_m' }, 'Page 1 of 3'],
  ]) {
    await check(`${route}: output text`, async () => {
      const actual = (
        await texts(await (await multipart(`edit/${route}`, [input], options)).arrayBuffer())
      )[0];
      assert.ok(actual.includes(expected), `${route}: ${actual}`);
    });
  }
  await check('metadata: saved title and author', async () => {
    const doc = await pdf(
      await multipart('edit/metadata', [input], { title: 'Verified', author: 'Test' }),
    );
    assert.equal(doc.getTitle(), 'Verified');
    assert.equal(doc.getAuthor(), 'Test');
  });
  await check('resize-pages: scaled dimensions', async () => {
    const doc = await pdf(await multipart('misc/resize-pages', [input], { scale: 0.5 }));
    assert.deepEqual(doc.getPage(0).getSize(), { width: 200, height: 300 });
  });
  await check('page-size-convert: Letter dimensions', async () => {
    const doc = await pdf(
      await multipart('misc/page-size-convert', [input], { targetSize: 'letter' }),
    );
    assert.deepEqual(doc.getPage(0).getSize(), { width: 612, height: 792 });
  });
  await check('images-to-pdf: native sharp decode', async () => {
    const image = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#35a' },
    })
      .png()
      .toBuffer();
    const body = new FormData();
    body.append('files', new Blob([image], { type: 'image/png' }), 'image.png');
    body.append('options', '{}');
    assert.equal(
      (
        await pdf(await request('convert-to/images-to-pdf', { method: 'POST', body }))
      ).getPageCount(),
      1,
    );
  });
  await check('extract-text: worker PDF.js response', async () =>
    assert.match(
      await (await multipart('convert-from/extract-text', [input])).text(),
      /PAGE1[\s\S]*PAGE2[\s\S]*PAGE3/,
    ),
  );
  const formDoc = await PDFDocument.create();
  const formPage = formDoc.addPage([400, 600]);
  formDoc
    .getForm()
    .createTextField('name')
    .addToPage(formPage, { x: 40, y: 400, width: 200, height: 30 });
  const formInput = await formDoc.save();
  let filled;
  await check('forms-fill: persisted field value', async () => {
    filled = new Uint8Array(
      await (
        await multipart('forms/fill', [formInput], { fields: { name: 'Verified' } })
      ).arrayBuffer(),
    );
    assert.equal(
      (await PDFDocument.load(filled)).getForm().getTextField('name').getText(),
      'Verified',
    );
  });
  await check('forms-extract: typed field value', async () => {
    const result = await (await multipart('forms/extract', [filled])).json();
    assert.equal(result.fields.find((f) => f.name === 'name').value, 'Verified');
  });
  await check('forms-flatten: field removal preserves visible text', async () => {
    const bytes = await (await multipart('forms/flatten', [filled])).arrayBuffer();
    assert.equal((await PDFDocument.load(bytes)).getForm().getFields().length, 0);
    assert.match((await texts(bytes)).join(' '), /Verified/);
  });
  for (const [kind, data, expected] of [
    ['html', { html: '<h1>HTML VERIFIED</h1>' }, 'HTML VERIFIED'],
    ['markdown', { markdown: '# MARKDOWN VERIFIED', template: 'academic' }, 'MARKDOWN VERIFIED'],
  ]) {
    await check(`${kind}-to-pdf: gateway to real Chromium`, async () => {
      const response = await request(`render/${kind}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      assert.match((await texts(await response.arrayBuffer())).join(' '), new RegExp(expected));
    });
  }
  await check('file lifecycle: upload, reference input, output reference, delete', async () => {
    const body = new FormData();
    body.append('file', new Blob([input], { type: 'application/pdf' }), 'source.pdf');
    const meta = await (await request('files', { method: 'POST', body, expected: 201 })).json();
    const stored = await (
      await request('organize/rotate?output=ref', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileIds: [meta.id], options: { angle: 180 } }),
      })
    ).json();
    assert.equal(
      (await pdf(await request(`files/${stored.id}/content`))).getPage(0).getRotation().angle,
      180,
    );
    await request(`files/${meta.id}`, { method: 'DELETE', expected: 204 });
    await request(`files/${meta.id}/content`, { expected: 404 });
  });
  await check('invalid options: structured 400 response', async () => {
    const body = new FormData();
    body.append('file', new Blob([input]), 'input.pdf');
    body.append('options', JSON.stringify({ angle: 45 }));
    const error = await (
      await request('organize/rotate', { method: 'POST', body, expected: 400 })
    ).json();
    assert.equal(error.status, 400);
  });
  await check('private worker bearer authentication', async () => {
    for (const [port, path, body] of [
      [corePort, '/v1/execute/merge', { files: [] }],
      [renderPort, '/v1/render/html', { html: '<p>No token</p>' }],
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 401);
    }
  });
  console.log(`Verified ${events.length} checks across all 19 operations.`);
} finally {
  await stop();
  await rm(storage, { recursive: true, force: true });
}
