// tests/unit/write-it-model-line.test.tsx — the faint model a Hebrew Write it card draws under the pad stands on the pad's line (mw-5r3p30.958): tracing it is always Right, for the vav and the
// final nun, in every way each is written, on a phone's pad and a tablet's. The model's place is read from the svg the card draws (its viewBox, fitted to a pad of the width and height given the way
// an svg fits one: by the smaller scale, centred), not from the template's own frame, and what that places on the pad goes to the checker with what the card tells it.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GlyphStrokes } from '../../src/handwriting/GlyphStrokes';
import { variantsOf } from '../../src/handwriting/glyphs';
import { frameOfPad } from '../../src/handwriting/padFrame';
import { recognize, type InkPoint, type InkStroke } from '../../src/handwriting/recognizer';

afterEach(cleanup);

/** The pads of Write it: 256 px tall (h-64) whatever the screen; as wide as the card leaves it at 390 px and at a tablet's 820 px. */
const PADS: readonly [string, number, number][] = [
  ['390 x 844', 390 - 2 * 16 - 4, 256],
  ['820 wide', 820 - 2 * 16 - 4, 256],
  // the other screens of mw-5r3p30.976: a small phone, a laptop and a phone on its side (the pad is as tall, as wide as the card leaves it)
  ['360 x 640', 360 - 2 * 16 - 4, 256],
  ['1280 x 800', 1280 - 2 * 16 - 4, 256],
  ['844 x 390', 844 - 2 * 16 - 4, 256],
];

/** Points along 'M x y L x y ...', a point about every 0.02 design units. */
function pointsOf(d: string): [number, number][] {
  const corners = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);
  const out: [number, number][] = [corners[0]];
  for (let i = 1; i < corners.length; i += 1) {
    const [[x0, y0], [x1, y1]] = [corners[i - 1], corners[i]];
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.02));
    for (let s = 1; s <= steps; s += 1) out.push([x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps]);
  }
  return out;
}

describe('the Hebrew model under the pad, traced', () => {
  for (const letter of ['ו', 'ן']) {
    for (const [name, width, height] of PADS) {
      it(`${letter} traced on a ${name} pad is Right, in each way it is written`, () => {
        const { container } = render(<GlyphStrokes letter={letter} line faint animate testId="write-model" className="absolute inset-0 h-full w-full" />);
        const svg = container.querySelector('svg')!;
        const [x0, y0, w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
        // the svg fills the pad inside its 2 px border; it fits its viewBox to that by the smaller scale and centres it
        const [inside, up] = [[width - 4, height - 4], 2];
        const scale = Math.min(inside[0] / w, inside[1] / h);
        const place = ([x, y]: [number, number]): InkPoint => ({ x: up + inside[0] / 2 + (x - (x0 + w / 2)) * scale, y: up + inside[1] / 2 + (y - (y0 + h / 2)) * scale, t: 0 });
        const pad = frameOfPad(height)!;
        // the card's own model, as drawn
        const drawn: InkStroke[] = [...svg.querySelectorAll('path.glyph-stroke')].map((p) => pointsOf(p.getAttribute('d')!).map(place));
        expect(drawn.length).toBeGreaterThan(0);
        // the unit of the drawing is the pad's letter height, and its foot (design y 1) is on the pad's line
        expect(scale).toBeCloseTo(pad.capHeight, 5);
        expect(place([0, 1]).y).toBeCloseTo(pad.baseline, 0);
        expect(recognize(drawn, letter, { script: 'hbo', ...pad }).match, `${letter} as drawn`).toBe(true);
        // and every way the letter is written, set the same way
        variantsOf(letter)!.forEach((variant, i) => {
          const strokes: InkStroke[] = variant.map((stroke) => pointsOf(`M${stroke.map(([x, y]) => `${x} ${y}`).join(' L')}`).map(place));
          const result = recognize(strokes, letter, { script: 'hbo', ...pad });
          expect(result.match, `${letter} variant ${i}`).toBe(true);
          expect(result.caseChecked, `${letter} variant ${i} told by its place`).toBe(true);
        });
      });
    }
  }
});
