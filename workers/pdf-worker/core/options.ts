import type { HtmlRenderOptions, PdfFormat, PdfMargin } from './html.js';
import type { MarkdownRenderOptions } from './markdown.js';
import { TEMPLATE_NAMES, isTemplateName } from './templates/index.js';

/** A request option that is unknown or out of range. */
export class InvalidOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOptionsError';
  }
}

const FORMATS: readonly PdfFormat[] = ['A4', 'Letter', 'Legal'];
const MARGIN_SIDES = ['top', 'right', 'bottom', 'left'] as const;
/** A length Chromium's print settings accept: a number with px, in, cm or mm (px when bare). */
const MARGIN_LENGTH = /^(?:\d{1,4}(?:\.\d{1,4})?|\.\d{1,4})(?:px|in|cm|mm)?$/i;
const PAGE_KEYS = [
  'format',
  'printBackground',
  'preferCssPageSize',
  'margin',
  // Kept because existing gateways send it; the render deadline still bounds it.
  'navigationTimeoutMs',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  where: string,
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new InvalidOptionsError(`Unknown ${where} "${key}". Allowed: ${allowed.join(', ')}.`);
    }
  }
}

function parseMargin(value: unknown): PdfMargin {
  if (!isPlainObject(value)) {
    throw new InvalidOptionsError('Option "margin" must be an object.');
  }
  rejectUnknownKeys(value, MARGIN_SIDES, 'margin side');
  const margin: PdfMargin = {};
  for (const side of MARGIN_SIDES) {
    const length = value[side];
    if (length === undefined) continue;
    if (typeof length !== 'string' || !MARGIN_LENGTH.test(length.trim())) {
      throw new InvalidOptionsError(
        `Margin "${side}" must be a length such as "0", "12mm" or "0.5in".`,
      );
    }
    margin[side] = length.trim();
  }
  return margin;
}

function parsePageOptions(value: Record<string, unknown>): HtmlRenderOptions {
  const options: HtmlRenderOptions = {};
  if (value.format !== undefined) {
    if (!FORMATS.includes(value.format as PdfFormat)) {
      throw new InvalidOptionsError(`Option "format" must be one of ${FORMATS.join(', ')}.`);
    }
    options.format = value.format as PdfFormat;
  }
  for (const key of ['printBackground', 'preferCssPageSize'] as const) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== 'boolean') {
      throw new InvalidOptionsError(`Option "${key}" must be true or false.`);
    }
    options[key] = value[key];
  }
  if (value.margin !== undefined) options.margin = parseMargin(value.margin);
  if (value.navigationTimeoutMs !== undefined) {
    const ms = value.navigationTimeoutMs;
    if (typeof ms !== 'number' || !Number.isInteger(ms) || ms < 1_000 || ms > 120_000) {
      throw new InvalidOptionsError(
        'Option "navigationTimeoutMs" must be a whole number from 1000 to 120000.',
      );
    }
    options.navigationTimeoutMs = ms;
  }
  return options;
}

/**
 * Validate the `options` of an HTML render request. Only page settings are
 * accepted; anything else (a browser path, launch flags) is refused.
 */
export function parseHtmlOptions(raw: unknown): HtmlRenderOptions {
  if (raw === undefined) return {};
  if (!isPlainObject(raw)) throw new InvalidOptionsError('Field "options" must be an object.');
  rejectUnknownKeys(raw, PAGE_KEYS, 'option');
  return parsePageOptions(raw);
}

/** Validate the `options` of a Markdown render request: page settings plus template and title. */
export function parseMarkdownOptions(raw: unknown): MarkdownRenderOptions {
  if (raw === undefined) return {};
  if (!isPlainObject(raw)) throw new InvalidOptionsError('Field "options" must be an object.');
  rejectUnknownKeys(raw, [...PAGE_KEYS, 'template', 'title'], 'option');
  const options: MarkdownRenderOptions = parsePageOptions(raw);
  if (raw.template !== undefined) {
    if (!isTemplateName(raw.template)) {
      throw new InvalidOptionsError(
        `Unknown template "${String(raw.template)}". Valid templates: ${TEMPLATE_NAMES.join(', ')}.`,
      );
    }
    options.template = raw.template;
  }
  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || raw.title.length > 500) {
      throw new InvalidOptionsError('Option "title" must be text of at most 500 characters.');
    }
    options.title = raw.title;
  }
  return options;
}
