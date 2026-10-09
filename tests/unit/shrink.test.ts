// shrinkImage cuts a picture to about 1280 px on the long edge and a JPEG under 300 KB on the phone (a canvas). jsdom has no
// canvas, so the test replaces the seam (decode, encode) and proves the sizes asked for and the quality walk.
import { afterEach, describe, expect, it } from 'vitest';
import { MAX_EDGE, MAX_SHRUNK_BYTES, fitWithin, imageSeam, shrinkImage } from '../../src/images/shrink';

const real = { ...imageSeam };
afterEach(() => Object.assign(imageSeam, real));

interface Call {
  width: number;
  height: number;
  quality: number;
}

/** A fake picture of `width` x `height` whose encoding is `bytesAt(call)` long. */
function fakeImage(width: number, height: number, bytesAt: (call: Call) => number): Call[] {
  const calls: Call[] = [];
  imageSeam.decode = async () => ({ width, height, source: null });
  imageSeam.encode = async (_decoded, w, h, quality) => {
    calls.push({ width: w, height: h, quality });
    return new Blob([new Uint8Array(bytesAt({ width: w, height: h, quality }))], { type: 'image/jpeg' });
  };
  return calls;
}

describe('fitWithin', () => {
  it('scales the long edge to the maximum and keeps the shape', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });
  it('never makes a small picture larger', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });
});

describe('shrinkImage', () => {
  it('turns a 4000x3000 picture into 1280 on the long edge', async () => {
    const calls = fakeImage(4000, 3000, () => 100_000);
    const out = await shrinkImage(new File(['x'], 'big.png', { type: 'image/png' }));
    expect(calls[0]).toMatchObject({ width: MAX_EDGE, height: 960 });
    expect(out.type).toBe('image/jpeg');
    expect(out.size).toBeLessThanOrEqual(MAX_SHRUNK_BYTES);
  });

  it('lowers the quality, then the size, until the JPEG is under 300 KB', async () => {
    const calls = fakeImage(4000, 3000, ({ width, quality }) => Math.round(width * quality * 400));
    const out = await shrinkImage(new File(['x'], 'big.png', { type: 'image/png' }));
    expect(out.size).toBeLessThanOrEqual(MAX_SHRUNK_BYTES);
    expect(calls.length).toBeGreaterThan(1);
    expect(calls[1].quality).toBeLessThan(calls[0].quality);
  });

  it('gives up with the smallest try rather than looping forever', async () => {
    const calls = fakeImage(4000, 3000, () => 5_000_000);
    const out = await shrinkImage(new File(['x'], 'big.png', { type: 'image/png' }));
    expect(out.size).toBe(5_000_000);
    expect(calls.length).toBeLessThan(20);
  });
});
