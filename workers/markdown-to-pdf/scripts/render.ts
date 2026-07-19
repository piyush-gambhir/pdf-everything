#!/usr/bin/env node
/**
 * Render a Markdown file to PDF from the command line.
 *
 *   tsx scripts/render.ts <input.md> [options]
 *
 * Options:
 *   --template <github|academic|rca>   Visual template (default: github)
 *   --out <path>                       Output PDF path (default: <input>.pdf)
 *   --title <string>                   PDF title metadata (default: first H1 or filename)
 *   --format <A4|Letter|Legal>         Page format (default: A4)
 *   --chrome <path>                    Explicit Chromium/Chrome binary
 *
 * If no Chrome is found on the system, the locally-downloaded
 * Chrome-for-Testing (./chrome) is used automatically.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { resolve, basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdownToPdf, resolveChromiumPath } from '../core/pdf.js';
import {
  TEMPLATE_NAMES,
  isTemplateName,
  type TemplateName,
} from '../core/templates/index.js';

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

interface CliArgs {
  input: string;
  template: TemplateName;
  out: string;
  title?: string;
  format: 'A4' | 'Letter' | 'Legal';
  chrome?: string;
}

function fail(msg: string): never {
  console.error(`Error: ${msg}\n`);
  console.error(
    `Usage: tsx scripts/render.ts <input.md> [--template ${TEMPLATE_NAMES.join('|')}] ` +
      `[--out file.pdf] [--title "..."] [--format A4|Letter|Legal] [--chrome /path/to/chrome]`,
  );
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  let input: string | undefined;
  let template: TemplateName = 'github';
  let out: string | undefined;
  let title: string | undefined;
  let format: 'A4' | 'Letter' | 'Legal' = 'A4';
  let chrome: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`Missing value for ${arg}`);
      return v;
    };
    switch (arg) {
      case '--template':
      case '-t': {
        const v = next();
        if (!isTemplateName(v))
          fail(`Unknown template "${v}". Valid: ${TEMPLATE_NAMES.join(', ')}`);
        template = v;
        break;
      }
      case '--out':
      case '-o':
        out = next();
        break;
      case '--title':
        title = next();
        break;
      case '--format':
        format = next() as CliArgs['format'];
        break;
      case '--chrome':
        chrome = next();
        break;
      case '-h':
      case '--help':
        fail('Showing usage');
        break;
      default:
        if (arg.startsWith('-')) fail(`Unknown option ${arg}`);
        if (input) fail(`Unexpected extra argument "${arg}"`);
        input = arg;
    }
  }

  if (!input) fail('No input markdown file provided');
  const inputPath = resolve(input);
  if (!existsSync(inputPath)) fail(`Input file not found: ${inputPath}`);

  const base = basename(inputPath, extname(inputPath));
  return {
    input: inputPath,
    template,
    out: out ? resolve(out) : resolve(dirname(inputPath), `${base}.pdf`),
    title,
    format,
    chrome,
  };
}

/** Derive a title from the first `# H1`, else the filename. */
function deriveTitle(markdown: string, inputPath: string): string {
  const h1 = markdown.match(/^#\s+(.+?)\s*$/m);
  if (h1) return h1[1];
  return basename(inputPath, extname(inputPath));
}

/** Recursively look for a Chrome/Chromium binary under a directory (bounded). */
function findChromeUnder(dir: string, depth = 0): string | null {
  if (depth > 6 || !existsSync(dir)) return null;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const targets = new Set([
    'Google Chrome for Testing',
    'Chromium',
    'chromium',
    'chrome',
  ]);
  // Files first.
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isFile() && targets.has(name)) return full;
  }
  // Then descend.
  for (const name of entries) {
    const full = join(dir, name);
    try {
      if (statSync(full).isDirectory()) {
        const found = findChromeUnder(full, depth + 1);
        if (found) return found;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function resolveChrome(explicit?: string): string {
  if (explicit) {
    if (!existsSync(explicit)) fail(`--chrome path not found: ${explicit}`);
    return explicit;
  }
  // env var + standard system locations
  const standard = resolveChromiumPath();
  if (standard) return standard;
  // locally-downloaded Chrome-for-Testing (@puppeteer/browsers install chrome)
  const local = findChromeUnder(join(PKG_ROOT, 'chrome'));
  if (local) return local;
  fail(
    'No Chrome/Chromium found. Install one with:\n' +
      '  pnpm dlx @puppeteer/browsers install chrome@stable\n' +
      'or pass --chrome /path/to/binary (or set PUPPETEER_EXECUTABLE_PATH).',
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const markdown = readFileSync(args.input, 'utf8');
  const title = args.title ?? deriveTitle(markdown, args.input);
  const executablePath = resolveChrome(args.chrome);

  console.log(`Rendering ${basename(args.input)} → ${args.template} template`);
  const pdf = await renderMarkdownToPdf(markdown, {
    template: args.template,
    format: args.format,
    title,
    executablePath,
  });

  writeFileSync(args.out, pdf);
  console.log(`Saved → ${args.out} (${(pdf.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
