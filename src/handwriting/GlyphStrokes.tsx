// src/handwriting/GlyphStrokes.tsx — a letter drawn from the checker's own templates (templates.ts, its first variant), for Write it (mw-86e9r1.51): faint
// under the pad to trace, beside it to copy, and after 'Not quite' as the right strokes. With `animate` each stroke is drawn in turn, start to end, so the
// order and the direction show (index.css .glyph-stroke). The design frame is fitted to the box whatever the letter's height.
// It teaches the form (mw-86e9r1.56): each stroke has a numbered start point and an arrowhead along it, both drawn in the SVG and kept when the animation is
// over, and StrokeLine is the plain line under the model that says how many strokes there are.
import { GLYPHS, type Variant } from './templates';
import { strokeLineOf } from './writeText';

/** Each stroke takes this long to draw, and the next starts when it ends. */
const STROKE_MS = 700;

/** The way the letter is shown: its first variant. */
const modelOf = (letter: string): Variant => GLYPHS[letter]?.[0] ?? [];

function boxOf(variant: Variant): { x: number; y: number; side: number } {
  const points = variant.flat();
  if (points.length === 0) return { x: 0, y: 0, side: 1 };
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // a square box around the letter, with room for the pen's width
  const side = Math.max(maxX - minX, maxY - minY, 0.4) * 1.3;
  const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];
  return { x: cx - side / 2, y: cy - side / 2, side };
}

const viewBoxOf = (variant: Variant): string => {
  const { x, y, side } = boxOf(variant);
  return `${x} ${y} ${side} ${side}`;
};

/** Where along a stroke the arrowhead sits, as a fraction of its length: past the start marker, clear of the end of a closed loop. */
const CUE_AT = 0.6;

/** The point a fraction of the way along a stroke, and the way the pen is going there in degrees (0 right, 90 down). */
function alongOf(stroke: Variant[number], fraction: number): { x: number; y: number; angle: number } {
  const lengths = stroke.map((p, i) => (i === 0 ? 0 : Math.hypot(p[0] - stroke[i - 1][0], p[1] - stroke[i - 1][1])));
  const total = lengths.reduce((a, b) => a + b, 0);
  let walked = 0;
  let at = stroke.length - 1;
  for (let i = 1; i < stroke.length; i += 1) {
    walked += lengths[i];
    if (walked >= total * fraction) {
      at = i;
      break;
    }
  }
  // the way it goes: from a point a little behind to a point a little ahead, so a bend does not turn the head sideways
  const [from, to] = [stroke[Math.max(0, at - 2)], stroke[Math.min(stroke.length - 1, at + 1)]];
  return { x: stroke[at][0], y: stroke[at][1], angle: Math.round((Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI) };
}

const pathOf = (stroke: Variant[number]): string => stroke.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ');

export function GlyphStrokes({ letter, animate = false, faint = false, className = '', testId }: {
  letter: string;
  animate?: boolean;
  faint?: boolean;
  className?: string;
  testId?: string;
}) {
  const variant = modelOf(letter);
  // the dot and the head are sized to the box, so they read at the small size beside the pad as well as the large one
  const { side } = boxOf(variant);
  const [dot, head] = [side * 0.075, side * 0.08];
  return (
    <svg
      data-testid={testId}
      data-letter={letter}
      data-animate={animate || undefined}
      viewBox={viewBoxOf(variant)}
      aria-hidden="true"
      className={`${className} ${faint ? 'text-muted' : 'text-accent'}`}
    >
      {variant.map((stroke, i) => (
        <path
          key={i}
          d={pathOf(stroke)}
          pathLength={1}
          data-animate={animate || undefined}
          className={faint ? 'glyph-stroke opacity-40' : 'glyph-stroke'}
          style={animate ? { animationDelay: `${i * STROKE_MS}ms` } : undefined}
          fill="none"
          stroke="currentColor"
          strokeWidth={faint ? 0.045 : 0.06}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {variant.map((stroke, i) => {
        const { x, y, angle } = alongOf(stroke, CUE_AT);
        return (
          <path
            key={`cue${i}`}
            data-direction={i + 1}
            data-animate={animate || undefined}
            className="glyph-cue fill-accent"
            style={animate ? { animationDelay: `${(i + CUE_AT) * STROKE_MS}ms` } : undefined}
            d={`M${head} 0 L${-head} ${head * 0.9} L${-head * 0.5} 0 L${-head} ${-head * 0.9} Z`}
            transform={`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${angle})`}
          />
        );
      })}
      {variant.map((stroke, i) => (
        <g key={`start${i}`} data-start-marker={i + 1}>
          <circle cx={stroke[0][0]} cy={stroke[0][1]} r={dot} className="fill-accent" />
          <text x={stroke[0][0]} y={stroke[0][1]} fontSize={dot * 1.35} fontWeight="700" textAnchor="middle" dominantBaseline="central" className="fill-canvas">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** The plain line under the model: read by a screen reader, since the picture itself is hidden from one. */
export function StrokeLine({ letter }: { letter: string }) {
  return (
    <p data-testid="write-stroke-line" className="mt-1 text-base text-muted">
      {strokeLineOf(letter)}
    </p>
  );
}
