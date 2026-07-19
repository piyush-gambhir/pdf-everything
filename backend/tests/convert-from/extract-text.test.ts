import { describe, expect, it } from 'vitest';
import { extractText } from '../../src/pdf-core/convert-from/extract-text.js';
import { makePdf } from '../fixtures.js';

describe('extractText', () => {
  it('extracts page labels from a generated PDF', async () => {
    const src = await makePdf(3, 'PAGE', { useObjectStreams: false });
    const { text, pageCount } = await extractText(src);
    expect(pageCount).toBe(3);
    expect(text).toContain('PAGE1');
    expect(text).toContain('PAGE2');
    expect(text).toContain('PAGE3');
  });
});
