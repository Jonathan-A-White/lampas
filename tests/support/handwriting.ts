// tests/support/handwriting.ts — synthesised pen writings for the handwriting checker's tests (mw-86e9r1.50).
// Nothing here is a recording: a "writer" takes a letter's authored variant (src/handwriting/templates.ts), samples it at
// its own spacing, slants, stretches and wobbles it, draws its strokes in a shuffled order and direction, and puts it
// somewhere on a pad at some size. The checker resamples and normalises, so it never sees the template's own points.
import { mulberry32, shuffle, type Random } from '../../src/data/random';
import { GLYPHS } from '../../src/handwriting/templates';
import type { InkPoint, InkStroke } from '../../src/handwriting/recognizer';

/** The height of a capital letter on the test pad, in pixels. */
export const CAP_HEIGHT = 200;
/** Where the writing sits on the pad (px): its middle, and so the line it stands on, half a cap height below. */
const MIDDLE = { x: 300, y: 400 };

/** What the pad would tell the checker about a writing made with this distortion: how tall a capital is, and the line it stands on. */
export function padOf(distortion: Distortion = {}): { capHeight: number; baseline: number } {
  const capHeight = CAP_HEIGHT * (distortion.scale ?? 1);
  return { capHeight, baseline: MIDDLE.y + capHeight / 2 };
}

export interface Writer {
  /** Which authored variant of the letter this writer draws (taken modulo the variants there are). */
  variant: number;
  /** Slant: how far the top leans right, as a share of the height. */
  slant: number;
  /** Width stretch. */
  stretch: number;
  /** Wobble of the line, as a share of the cap height. */
  wobble: number;
  /** Sample spacing along the line, as a share of the cap height. */
  spacing: number;
  seed: number;
}

/** Three different hands; together they use every authored variant of a letter that has two. */
export const WRITERS: readonly Writer[] = [
  { variant: 0, slant: 0.1, stretch: 1.0, wobble: 0.012, spacing: 0.035, seed: 11 },
  { variant: 1, slant: -0.05, stretch: 1.15, wobble: 0.018, spacing: 0.05, seed: 23 },
  { variant: 2, slant: 0.15, stretch: 0.88, wobble: 0.01, spacing: 0.025, seed: 37 },
];

export interface Distortion {
  /** Multiplies the size (1 = CAP_HEIGHT per cap height). */
  scale?: number;
  /** Degrees, clockwise on the screen. */
  rotate?: number;
  /** Standard deviation of per-point noise, as a share of the cap height. */
  jitter?: number;
  /** Reverse the order of the strokes and the direction of each. */
  reverse?: boolean;
}

function gaussian(random: Random): number {
  const u = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

function densify(line: readonly (readonly [number, number])[], step: number): [number, number][] {
  const out: [number, number][] = [[line[0][0], line[0][1]]];
  let carry = 0;
  for (let i = 1; i < line.length; i += 1) {
    const [x0, y0] = line[i - 1];
    const [x1, y1] = line[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    let at = step - carry;
    while (at < length) {
      out.push([x0 + ((x1 - x0) * at) / length, y0 + ((y1 - y0) * at) / length]);
      at += step;
    }
    carry = length - (at - step);
  }
  out.push([line[line.length - 1][0], line[line.length - 1][1]]);
  return out;
}

/** One writing of `letter` as stroke sets of {x, y, t} points, the way a pad would hand them over. */
export function writing(letter: string, writer: Writer, distortion: Distortion = {}): InkStroke[] {
  const variants = GLYPHS[letter];
  if (!variants) throw new Error(`no template for ${letter}`);
  const design = variants[writer.variant % variants.length];
  const random = mulberry32(writer.seed * 7919 + letter.codePointAt(0)!);
  const scale = (distortion.scale ?? 1) * CAP_HEIGHT;
  const angle = ((distortion.rotate ?? 0) * Math.PI) / 180;
  const jitter = (distortion.jitter ?? 0) * scale;
  const phase = random() * Math.PI * 2;

  let strokes = design.map((line) => densify(line, writer.spacing * (0.7 + 0.6 * random())));
  strokes = writer.variant === 0 && !distortion.reverse ? strokes : shuffle(strokes, random);
  strokes = strokes.map((line) => (random() < 0.4 ? [...line].reverse() : line));
  if (distortion.reverse) strokes = strokes.map((line) => [...line].reverse()).reverse();

  const cx = 0.4;
  const cy = 0.5;
  const placed = strokes.map((line) =>
    line.map(([x0, y0], index) => {
      // slant and stretch about the middle of the letter, then a slow wobble, then the size
      let x = (x0 - cx) * writer.stretch + writer.slant * (cy - y0);
      let y = y0 - cy;
      x += writer.wobble * Math.sin(index * 0.35 + phase);
      y += writer.wobble * Math.cos(index * 0.29 + phase * 1.3);
      const rx = x * Math.cos(angle) - y * Math.sin(angle);
      const ry = x * Math.sin(angle) + y * Math.cos(angle);
      return [
        MIDDLE.x + rx * scale + jitter * gaussian(random),
        MIDDLE.y + ry * scale + jitter * gaussian(random),
      ] as [number, number];
    }),
  );

  let t = 1000;
  return placed.map((line) => {
    t += 180; // the pen is up between strokes
    return line.map(([x, y]): InkPoint => {
      t += 8;
      return { x, y, t };
    });
  });
}
