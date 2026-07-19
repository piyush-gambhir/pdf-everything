import { describe, expect, it } from 'vitest';
import { rotatePdf } from '../../src/organize/rotate.js';
import { makePdf, pageRotations } from '../fixtures.js';

describe('rotatePdf', () => {
  it('rotates all pages 90 degrees by default', async () => {
    const src = await makePdf(3);
    const out = await rotatePdf(src, { angle: 90 });
    expect(await pageRotations(out)).toEqual([90, 90, 90]);
  });

  it('rotates only specified pages', async () => {
    const src = await makePdf(4);
    const out = await rotatePdf(src, { angle: 180, pages: '2,4' });
    expect(await pageRotations(out)).toEqual([0, 180, 0, 180]);
  });

  it('rotation is additive when applied twice', async () => {
    const src = await makePdf(1);
    let out = await rotatePdf(src, { angle: 90 });
    out = await rotatePdf(out, { angle: 90 });
    expect(await pageRotations(out)).toEqual([180]);
  });
});
