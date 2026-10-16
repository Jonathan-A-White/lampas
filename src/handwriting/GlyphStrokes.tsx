// src/handwriting/GlyphStrokes.tsx — a letter drawn from the checker's own templates (templates.ts, its first variant), for Write it (mw-86e9r1.51): faint
// under the pad to trace, beside it to copy, and after 'Not quite' as the right strokes. With `animate` each stroke is drawn in turn, start to end, so the
// order and the direction show (index.css .glyph-stroke). The design frame is fitted to the box whatever the letter's height.
import { GLYPHS, type Variant } from './templates';

/** Each stroke takes this long to draw, and the next starts when it ends. */
const STROKE_MS = 700;

/** The way the letter is shown: its first variant. */
const modelOf = (letter: string): Variant => GLYPHS[letter]?.[0] ?? [];

function viewBoxOf(variant: Variant): string {
  const points = variant.flat();
  if (points.length === 0) return '0 0 1 1';
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // a square box around the letter, with room for the pen's width
  const side = Math.max(maxX - minX, maxY - minY, 0.4) * 1.3;
  const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];
  return `${cx - side / 2} ${cy - side / 2} ${side} ${side}`;
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
  return (
    <svg
      data-testid={testId}
      data-letter={letter}
      data-animate={animate || undefined}
      viewBox={viewBoxOf(variant)}
      aria-hidden="true"
      className={`${className} ${faint ? 'text-muted opacity-40' : 'text-accent'}`}
    >
      {variant.map((stroke, i) => (
        <path
          key={i}
          d={pathOf(stroke)}
          pathLength={1}
          data-animate={animate || undefined}
          className="glyph-stroke"
          style={animate ? { animationDelay: `${i * STROKE_MS}ms` } : undefined}
          fill="none"
          stroke="currentColor"
          strokeWidth={faint ? 0.045 : 0.06}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
