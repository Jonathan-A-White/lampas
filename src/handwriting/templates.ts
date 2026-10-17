// src/handwriting/templates.ts — how each Greek letter is written, for the handwriting checker (mw-86e9r1.50).
// Every letter has two or more VARIANTS, ways people really write it (one stroke or several, a loop or a bar). A variant is a list
// of strokes; a stroke is a list of [x, y] points in one design frame shared by all letters: y runs down, a capital stands from
// y 0 to 1 (the baseline), a small letter's body from 0.5 to 1, an ascender reaches up to 0 and a descender down to 1.5, x is in
// the same units. Stroke order and direction do not matter to the checker, so they are drawn however is easy here.
// These are drawn by hand from the letters' usual shapes, not learned from anyone's pen; recorded samples would sharpen them.
// The FIRST variant of a letter is also the model Write it shows the reader (GlyphStrokes.tsx), so it is written as a pen writes it (mw-86e9r1.55).

export type Point = readonly [number, number];
export type Stroke = readonly Point[];
export type Variant = readonly Stroke[];

/** Points along an ellipse: centre, radii, and the angles in degrees (0 right, 90 down, so a rising angle turns clockwise). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number): Point[] {
  const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 15));
  const out: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }
  return out;
}

/** Straight stretches are drawn as many points, at most this far apart, so that a pen that jumps shows as a gap between two points. */
const STEP = 0.1;

/** A straight line through the points, with a point at least every STEP along it. */
function line(...points: Point[]): Point[] {
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1], points[i]];
    const parts = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
    for (let k = 1; k <= parts; k += 1) out.push([a[0] + ((b[0] - a[0]) * k) / parts, a[1] + ((b[1] - a[1]) * k) / parts]);
  }
  return out;
}

/** One smooth curve through the points (Catmull-Rom), the way a pen moves round a bend; a point at least every STEP along it. */
function curve(...points: Point[]): Point[] {
  const at = (i: number): Point => points[Math.min(points.length - 1, Math.max(0, i))];
  const out: Point[] = [points[0]];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const parts = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (STEP * 0.6)));
    for (let k = 1; k <= parts; k += 1) {
      const t = k / parts;
      const [t2, t3] = [t * t, t * t * t];
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** Parts that follow one another in ONE pen movement: each begins where the one before ends (it throws if one does not). */
function join(...parts: Point[][]): Point[] {
  for (let i = 1; i < parts.length; i += 1) {
    const [end, start] = [parts[i - 1][parts[i - 1].length - 1], parts[i][0]];
    if (Math.hypot(end[0] - start[0], end[1] - start[1]) > 0.06) throw new Error(`templates: a joined stroke jumps from ${end} to ${start}`);
  }
  return parts.flat();
}

/** Small letters (and the final sigma), keyed by the letter. */
const SMALL: Record<string, Variant[]> = {
  // the first variant of each letter is the one Write it shows (GlyphStrokes): written as a pen writes it, one movement where a pen makes one
  // (a loop letter is a single curve with its tail joined to its bowl), and a second stroke begins on the first (tests/unit/write-it.test.tsx)
  α: [
    [curve([0.5, 0.56], [0.3, 0.5], [0.1, 0.58], [0.04, 0.75], [0.12, 0.93], [0.3, 1.0], [0.47, 0.92], [0.54, 0.74], [0.56, 0.54], [0.6, 0.62], [0.62, 0.85], [0.74, 0.99])],
    [arc(0.26, 0.75, 0.26, 0.25, -40, -320), line([0.52, 0.5], [0.53, 0.8], [0.6, 0.95], [0.74, 0.99])],
  ],
  β: [
    [join(line([0.1, 1.45], [0.1, 0.95], [0.1, 0.45], [0.14, 0.12], [0.32, 0.0]), arc(0.32, 0.22, 0.2, 0.22, -90, 90), arc(0.32, 0.72, 0.27, 0.28, -90, 90))],
    [line([0.1, 1.45], [0.1, 0.2], [0.14, 0.05]), join(arc(0.3, 0.2, 0.2, 0.2, -120, 90), arc(0.3, 0.72, 0.27, 0.28, -90, 90))],
  ],
  γ: [
    [curve([0.05, 0.5], [0.16, 0.78], [0.3, 1.12], [0.28, 1.32], [0.15, 1.48]), curve([0.3, 1.12], [0.5, 0.88], [0.68, 0.5])],
    [line([0.05, 0.5], [0.12, 0.75], [0.28, 0.98], [0.5, 0.75], [0.62, 0.5]), line([0.28, 0.98], [0.27, 1.25], [0.12, 1.47])],
  ],
  δ: [
    [join(curve([0.6, 0.12], [0.45, 0.02], [0.3, 0.08], [0.33, 0.28], [0.418, 0.523]), arc(0.3, 0.75, 0.28, 0.25, -65, -425))],
    [arc(0.3, 0.75, 0.28, 0.25, -90, -450), line([0.6, 0.08], [0.4, 0.0], [0.3, 0.12], [0.32, 0.3], [0.3, 0.5])],
  ],
  ε: [
    [curve([0.52, 0.58], [0.3, 0.5], [0.12, 0.6], [0.16, 0.7], [0.34, 0.74], [0.14, 0.8], [0.08, 0.92], [0.26, 1.0], [0.5, 0.95])],
    [arc(0.3, 0.75, 0.25, 0.25, -40, -320), line([0.15, 0.75], [0.4, 0.75])],
  ],
  ς: [
    [curve([0.55, 0.52], [0.3, 0.5], [0.12, 0.6], [0.08, 0.8], [0.25, 0.98], [0.45, 1.0], [0.54, 1.1], [0.45, 1.25])],
    [line([0.6, 0.55], [0.3, 0.5], [0.1, 0.65], [0.1, 0.85]), line([0.1, 0.85], [0.25, 0.99], [0.5, 1.0], [0.55, 1.15], [0.45, 1.3])],
  ],
  ζ: [
    [curve([0.55, 0.02], [0.25, 0.02], [0.2, 0.15], [0.35, 0.3], [0.2, 0.45], [0.1, 0.6], [0.1, 0.8], [0.3, 0.95], [0.4, 1.1], [0.35, 1.3], [0.2, 1.45])],
    [line([0.6, 0.0], [0.2, 0.0]), line([0.2, 0.0], [0.15, 0.2], [0.35, 0.32], [0.15, 0.5], [0.08, 0.7], [0.15, 0.9], [0.35, 1.05], [0.38, 1.3], [0.22, 1.47])],
  ],
  η: [
    [line([0.1, 0.5], [0.1, 1.0]), curve([0.1, 0.75], [0.15, 0.58], [0.3, 0.52], [0.45, 0.6], [0.5, 0.8], [0.5, 1.45])],
    [join(line([0.1, 1.0], [0.1, 0.55], [0.1, 0.75]), curve([0.1, 0.75], [0.15, 0.58], [0.3, 0.52], [0.45, 0.6], [0.5, 0.8], [0.5, 1.45]))],
  ],
  θ: [
    [arc(0.3, 0.5, 0.25, 0.5, -90, 270), line([0.05, 0.5], [0.55, 0.5])],
    [join(arc(0.3, 0.5, 0.25, 0.5, -90, 90), arc(0.3, 0.5, 0.25, 0.5, 90, 270)), line([0.15, 0.52], [0.3, 0.46], [0.45, 0.5])],
  ],
  ι: [[curve([0.1, 0.5], [0.1, 0.88], [0.17, 0.99], [0.28, 0.99])], [line([0.1, 0.5], [0.1, 0.95])]],
  κ: [
    [line([0.1, 0.5], [0.1, 1.0]), line([0.1, 0.78], [0.52, 0.5]), line([0.1, 0.78], [0.55, 1.0])],
    [line([0.1, 0.5], [0.1, 1.0]), line([0.55, 0.5], [0.1, 0.78], [0.55, 1.0])],
  ],
  λ: [
    [line([0.12, 0.0], [0.2, 0.1], [0.55, 1.0]), line([0.39, 0.59], [0.12, 1.0])],
    [line([0.12, 0.0], [0.55, 1.0]), line([0.38, 0.55], [0.1, 1.0])],
  ],
  μ: [
    [line([0.1, 0.5], [0.1, 1.45]), join(curve([0.1, 0.72], [0.15, 0.93], [0.32, 1.0], [0.46, 0.88], [0.49, 0.52]), line([0.49, 0.52], [0.54, 0.86], [0.64, 0.98]))],
    [line([0.1, 0.5], [0.1, 1.45]), line([0.1, 0.55], [0.1, 0.85], [0.25, 1.0], [0.42, 0.92], [0.5, 0.5])],
  ],
  ν: [
    [line([0.05, 0.5], [0.15, 0.7], [0.32, 1.0], [0.45, 0.78], [0.58, 0.5])],
    [line([0.05, 0.5], [0.32, 1.0]), line([0.32, 1.0], [0.62, 0.5])],
  ],
  ξ: [
    [curve([0.6, 0.02], [0.3, 0.0], [0.16, 0.12], [0.28, 0.26], [0.5, 0.3], [0.3, 0.36], [0.12, 0.48], [0.1, 0.65], [0.25, 0.8], [0.5, 0.85], [0.3, 0.92], [0.15, 1.05], [0.2, 1.25], [0.35, 1.4])],
    [line([0.6, 0.02], [0.3, 0.0], [0.16, 0.12], [0.28, 0.26], [0.45, 0.3]), line([0.45, 0.3], [0.15, 0.45], [0.1, 0.65], [0.25, 0.82], [0.48, 0.86], [0.2, 1.0], [0.15, 1.2], [0.3, 1.4])],
  ],
  ο: [
    [arc(0.3, 0.75, 0.28, 0.25, -90, 270)],
    [arc(0.3, 0.75, 0.28, 0.25, -90, 90), arc(0.3, 0.75, 0.28, 0.25, 90, 270)],
  ],
  π: [
    [line([0.0, 0.52], [0.35, 0.5], [0.65, 0.5]), line([0.2, 0.51], [0.2, 1.0]), curve([0.5, 0.5], [0.5, 0.85], [0.6, 1.0])],
    [line([0.2, 1.0], [0.2, 0.5], [0.65, 0.5]), line([0.5, 0.5], [0.5, 0.9], [0.6, 1.0])],
  ],
  ρ: [
    [join(line([0.1, 1.45], [0.1, 0.8], [0.1, 0.72]), arc(0.3, 0.72, 0.2, 0.22, 180, 540))],
    [line([0.1, 1.45], [0.1, 0.5]), arc(0.3, 0.72, 0.2, 0.22, 180, 540)],
  ],
  σ: [
    [join(arc(0.28, 0.75, 0.26, 0.25, -90, -450), line([0.28, 0.5], [0.62, 0.5]))],
    [arc(0.28, 0.75, 0.26, 0.25, -60, -400), line([0.3, 0.5], [0.63, 0.5])],
  ],
  τ: [
    [line([0.0, 0.52], [0.35, 0.5], [0.65, 0.5]), curve([0.32, 0.5], [0.32, 0.88], [0.45, 1.0])],
    [line([0.0, 0.6], [0.1, 0.5], [0.62, 0.5]), line([0.34, 0.5], [0.34, 0.92], [0.46, 1.0])],
  ],
  υ: [
    [curve([0.1, 0.5], [0.1, 0.8], [0.2, 0.97], [0.35, 1.0], [0.5, 0.9], [0.58, 0.65], [0.6, 0.5])],
    [line([0.08, 0.5], [0.1, 0.85], [0.3, 1.0]), line([0.3, 1.0], [0.5, 0.85], [0.55, 0.5])],
  ],
  φ: [
    [line([0.35, 0.0], [0.35, 1.45]), arc(0.35, 0.72, 0.28, 0.22, -90, 270)],
    [line([0.33, 0.05], [0.37, 1.45]), join(arc(0.35, 0.72, 0.28, 0.22, 180, 360), arc(0.35, 0.72, 0.28, 0.22, 0, 180))],
  ],
  χ: [
    [line([0.05, 0.5], [0.55, 1.5]), line([0.55, 0.5], [0.05, 1.5])],
    [line([0.05, 0.5], [0.2, 0.9], [0.55, 1.5]), line([0.55, 0.5], [0.4, 0.9], [0.05, 1.5])],
  ],
  ψ: [
    [line([0.4, 0.0], [0.4, 1.45]), curve([0.05, 0.5], [0.08, 0.85], [0.4, 1.0], [0.72, 0.85], [0.75, 0.5])],
    [curve([0.05, 0.5], [0.08, 0.85], [0.4, 1.0], [0.72, 0.85], [0.75, 0.5]), line([0.4, 0.0], [0.4, 0.8], [0.4, 1.45])],
  ],
  ω: [
    [curve([0.0, 0.5], [0.02, 0.8], [0.15, 1.0], [0.28, 0.85], [0.3, 0.62], [0.32, 0.85], [0.45, 1.0], [0.58, 0.8], [0.6, 0.5])],
    [line([0.0, 0.5], [0.0, 0.75]), join(arc(0.15, 0.75, 0.15, 0.25, 180, 0)), join(arc(0.45, 0.75, 0.15, 0.25, 180, 0), line([0.6, 0.75], [0.6, 0.5]))],
  ],
};

/** Capital letters, keyed by the SMALL letter they go with (the capital is its toUpperCase). */
const CAPITAL: Record<string, Variant[]> = {
  α: [
    [line([0, 1], [0.4, 0], [0.8, 1]), line([0.14, 0.65], [0.66, 0.65])],
    [line([0.4, 0], [0, 1]), line([0.4, 0], [0.8, 1]), line([0.12, 0.7], [0.68, 0.7])],
  ],
  β: [
    [line([0, 0], [0, 1]), join(line([0, 0], [0.45, 0]), arc(0.45, 0.25, 0.3, 0.25, -90, 90), line([0.45, 0.5], [0, 0.5])), join(line([0, 0.5], [0.45, 0.5]), arc(0.45, 0.75, 0.37, 0.25, -90, 90), line([0.45, 1], [0, 1]))],
    [join(line([0, 1], [0, 0], [0.45, 0]), arc(0.45, 0.25, 0.27, 0.25, -90, 90), line([0.45, 0.5], [0, 0.5], [0.5, 0.5]), arc(0.5, 0.75, 0.3, 0.25, -90, 90), line([0.5, 1], [0, 1]))],
  ],
  γ: [
    [line([0, 1], [0, 0], [0.6, 0])],
    [line([0, 0], [0, 1]), line([0, 0], [0.6, 0])],
  ],
  δ: [
    [line([0.4, 0], [0, 1], [0.8, 1], [0.4, 0])],
    [line([0.4, 0], [0, 1]), line([0.4, 0], [0.8, 1]), line([0, 1], [0.8, 1])],
  ],
  ε: [
    [line([0.6, 0], [0, 0], [0, 1], [0.6, 1]), line([0, 0.5], [0.45, 0.5])],
    [line([0, 0], [0, 1]), line([0, 0], [0.6, 0]), line([0, 0.5], [0.45, 0.5]), line([0, 1], [0.6, 1])],
  ],
  ζ: [
    [line([0, 0], [0.7, 0], [0, 1], [0.7, 1])],
    [line([0, 0], [0.7, 0]), line([0.7, 0], [0, 1]), line([0, 1], [0.7, 1])],
  ],
  η: [
    [line([0, 0], [0, 1]), line([0, 0.5], [0.7, 0.5]), line([0.7, 0], [0.7, 1])],
    [line([0, 0], [0, 1]), line([0, 0.5], [0.7, 0.5]), line([0.7, 0], [0.7, 1])],
  ],
  θ: [
    [arc(0.45, 0.5, 0.45, 0.5, -90, 270), line([0.05, 0.5], [0.85, 0.5])],
    [join(arc(0.45, 0.5, 0.45, 0.5, -90, 90), arc(0.45, 0.5, 0.45, 0.5, 90, 270)), line([0.25, 0.5], [0.65, 0.5])],
  ],
  ι: [[line([0, 0], [0, 1])], [line([-0.15, 0], [0.15, 0]), line([0, 0], [0, 1]), line([-0.15, 1], [0.15, 1])]],
  κ: [
    [line([0, 0], [0, 1]), line([0, 0.55], [0.7, 0]), line([0.2, 0.393], [0.8, 1])],
    [line([0, 0], [0, 1]), line([0.7, 0], [0.05, 0.6], [0.8, 1])],
  ],
  λ: [
    [line([0, 1], [0.4, 0], [0.8, 1])],
    [line([0, 1], [0.4, 0]), line([0.4, 0], [0.8, 1])],
  ],
  μ: [
    [line([0, 1], [0, 0], [0.45, 0.7], [0.9, 0], [0.9, 1])],
    [line([0, 0], [0, 1]), line([0, 0], [0.45, 0.7], [0.9, 0]), line([0.9, 0], [0.9, 1])],
  ],
  ν: [
    [line([0, 1], [0, 0], [0.7, 1], [0.7, 0])],
    [line([0, 0], [0, 1]), line([0, 0], [0.7, 1]), line([0.7, 0], [0.7, 1])],
  ],
  ξ: [
    [line([0, 0], [0.7, 0]), line([0.15, 0.5], [0.55, 0.5]), line([0, 1], [0.7, 1])],
    [line([0, 0], [0.7, 0]), line([0.1, 0.5], [0.6, 0.5]), line([0, 1], [0.7, 1])],
  ],
  ο: [
    [arc(0.45, 0.5, 0.42, 0.5, -90, 270)],
    [arc(0.45, 0.5, 0.42, 0.5, -90, 90), arc(0.45, 0.5, 0.42, 0.5, 90, 270)],
  ],
  π: [
    [line([-0.05, 0], [0.9, 0]), line([0.1, 0], [0.1, 1]), line([0.75, 0], [0.75, 1])],
    [line([0.1, 1], [0.1, 0], [0.75, 0], [0.75, 1])],
  ],
  ρ: [
    [join(line([0, 1], [0, 0], [0.4, 0]), arc(0.4, 0.25, 0.22, 0.25, -90, 90), line([0.4, 0.5], [0, 0.5]))],
    [line([0, 0], [0, 1]), join(line([0, 0], [0.4, 0]), arc(0.4, 0.25, 0.22, 0.25, -90, 90), line([0.4, 0.5], [0, 0.5]))],
  ],
  σ: [
    [line([0.7, 0], [0, 0], [0.55, 0.5], [0, 1], [0.7, 1])],
    [line([0.7, 0.05], [0, 0], [0.55, 0.5]), line([0.55, 0.5], [0, 1], [0.7, 1])],
  ],
  τ: [
    [line([0, 0], [0.8, 0]), line([0.4, 0], [0.4, 1])],
    [line([0, 0], [0.4, 0], [0.8, 0]), line([0.4, 0], [0.4, 1])],
  ],
  υ: [
    [line([0, 0], [0.5, 0.55], [1, 0]), line([0.5, 0.55], [0.5, 1])],
    [line([0, 0], [0.48, 0.57]), line([1, 0], [0.5, 0.55], [0.5, 1])],
  ],
  φ: [
    [line([0.4, 0], [0.4, 1]), arc(0.4, 0.5, 0.4, 0.3, -90, 270)],
    [line([0.4, 0], [0.4, 1]), join(arc(0.4, 0.5, 0.4, 0.3, 180, 360), arc(0.4, 0.5, 0.4, 0.3, 0, 180))],
  ],
  χ: [
    [line([0, 0], [0.7, 1]), line([0.7, 0], [0, 1])],
    [line([0, 0], [0.35, 0.5], [0.7, 1]), line([0.7, 0], [0.35, 0.5], [0, 1])],
  ],
  ψ: [
    [line([0.4, 0], [0.4, 1]), curve([0, 0], [0.05, 0.55], [0.4, 0.7], [0.75, 0.55], [0.8, 0])],
    [curve([0, 0], [0.05, 0.55], [0.4, 0.7], [0.75, 0.55], [0.8, 0]), line([0.4, 0], [0.4, 1])],
  ],
  ω: [
    [join(line([0.05, 1], [0.2, 1], [0.26, 0.82]), arc(0.5, 0.45, 0.42, 0.45, 125, 415), line([0.74, 0.82], [0.8, 1], [0.95, 1]))],
    [join(line([0.05, 1], [0.25, 1], [0.26, 0.82]), arc(0.5, 0.45, 0.42, 0.45, 125, 415), line([0.74, 0.82], [0.75, 1], [0.95, 1]))],
  ],
};

/**
 * A Greek letter drawn as its Latin look-alike (mw-86e9r1.57): a shape the checker must not take for the letter asked for. The writing
 * is Close, not Right, when it is nearer to one of these `variants` than to the letter itself, and `hint` is the one line that says
 * where it differs. A letter with no entry here is told from its look-alike already (or is the same shape, below). `dot` is a Latin
 * i's dot: the strokes of a dot are too small for a cloud, so it is looked for beside the letter, not drawn.
 */
export interface Lookalike {
  /** The Latin letter it is written as, for the tests. */
  latin: string;
  hint: string;
  variants: readonly Variant[];
  dot?: boolean;
}

/**
 * The Greek small letters with a Latin look-alike that are told apart, keyed by the Greek letter. Not here, because a hand writes the
 * Greek and the Latin letter the same way and the judge asks which letter, not which alphabet: ν and v (two strokes meeting at a
 * point on the line), ρ and p (a stem below the line, a bowl on it), ο and o, and ω and w (omega is as often written pointed as
 * round, and a pointed one is a w).
 */
export const LOOKALIKES: Readonly<Record<string, readonly Lookalike[]>> = {
  γ: [
    {
      latin: 'y',
      hint: 'The arms of γ meet on the line, in a V, before the tail drops.',
      variants: [
        // the Governor's y: a u-shaped left arm meets the right stroke halfway up the body, and the right stroke runs on below the line
        [curve([0.05, 0.5], [0.08, 0.62], [0.15, 0.72], [0.27, 0.78], [0.4, 0.76], [0.47, 0.72]), line([0.55, 0.5], [0.35, 1.0], [0.15, 1.48])],
        // the arms as a V that meets halfway up the body
        [line([0.05, 0.5], [0.3, 0.78]), line([0.58, 0.5], [0.3, 0.78], [0.12, 1.47])],
        // a bowl whose bottom is a third of the way down
        [curve([0.05, 0.5], [0.08, 0.7], [0.18, 0.84], [0.32, 0.86], [0.44, 0.78]), line([0.5, 0.5], [0.35, 1.0], [0.18, 1.48])],
      ],
    },
  ],
  κ: [{ latin: 'k', hint: 'κ is no taller than the letters beside it: its stem does not rise above the arms.', variants: [[line([0.1, 0.0], [0.1, 1.0]), line([0.52, 0.5], [0.1, 0.78], [0.55, 1.0])]] }],
  χ: [{ latin: 'x', hint: 'χ goes down through the line: its legs reach below it, as an x does not.', variants: [[line([0.05, 0.5], [0.55, 1.0]), line([0.55, 0.5], [0.05, 1.0])]] }],
  υ: [
    {
      latin: 'u',
      hint: 'υ is a plain cup: there is no stem on its right, as a u has.',
      variants: [[curve([0.1, 0.5], [0.1, 0.85], [0.2, 0.98], [0.33, 1.0], [0.46, 0.96], [0.56, 0.85], [0.58, 0.5]), line([0.58, 0.5], [0.58, 1.0])]],
    },
  ],
  ι: [{ latin: 'i', hint: 'ι has no dot: it is a stem alone.', variants: [], dot: true }],
};

/** Every letter the checker knows: the 24 small letters, the final sigma, and the 24 capitals. */
export const GLYPHS: Readonly<Record<string, readonly Variant[]>> = (() => {
  const all: Record<string, readonly Variant[]> = { ...SMALL };
  for (const [small, variants] of Object.entries(CAPITAL)) all[small.toUpperCase()] = variants;
  return all;
})();

export const LETTERS: readonly string[] = Object.keys(GLYPHS);
