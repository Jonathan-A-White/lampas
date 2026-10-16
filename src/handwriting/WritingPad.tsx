// src/handwriting/WritingPad.tsx — the writing pad of Write it (mw-86e9r1.51): a pen or a finger writes on it, one stroke a pointer from down to up, and
// the strokes go to the checker as they were written (recognizer.ts takes them in the pad's own pixels, any size). Palm rejection: a hand resting on the
// screen while a pen writes is a touch, so once a pen has touched or hovered over the pad a touch never draws on it, and a touch stroke under way when the
// pen comes is dropped. A second finger is ignored. The pad never scrolls the page (touch-action none). `under` is drawn beneath the ink (the letter to trace).
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { InkPoint, InkStroke } from './recognizer';

interface Live {
  id: number;
  type: string;
  points: InkPoint[];
}

const polyline = (points: readonly InkPoint[]): string => points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export function WritingPad({ strokes, onChange, onStart, under, label }: {
  strokes: readonly InkStroke[];
  onChange: (strokes: InkStroke[]) => void;
  /** the first stroke on an empty pad has begun: hand, eye and ear meet (the card plays the letter's sound) */
  onStart?: () => void;
  under?: ReactNode;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  // a pen has touched or hovered over this pad: from then on a touch is a resting hand
  const penHere = useRef(false);
  const [drawing, setDrawing] = useState<readonly InkPoint[] | null>(null);

  const at = (e: ReactPointerEvent): InkPoint => {
    const rect = box.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), t: e.timeStamp };
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.pointerType === 'pen') {
      penHere.current = true;
      // the hand came down first: what it drew is not writing
      if (live.current && live.current.type !== 'pen') live.current = null;
    } else if (penHere.current && e.pointerType === 'touch') return;
    if (live.current) return; // a second finger, or a touch while the pen writes
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    box.current?.setPointerCapture?.(e.pointerId);
    if (strokes.length === 0) onStart?.();
    live.current = { id: e.pointerId, type: e.pointerType, points: [at(e)] };
    setDrawing(live.current.points);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.pointerType === 'pen') penHere.current = true;
    const stroke = live.current;
    if (!stroke || stroke.id !== e.pointerId) return;
    stroke.points = [...stroke.points, at(e)];
    setDrawing(stroke.points);
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const stroke = live.current;
    if (!stroke || stroke.id !== e.pointerId) return;
    live.current = null;
    setDrawing(null);
    onChange([...strokes, stroke.points]);
  };

  const cancel = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (live.current?.id !== e.pointerId) return;
    live.current = null;
    setDrawing(null);
  };

  return (
    <div
      ref={box}
      role="img"
      aria-label={label}
      data-testid="writing-pad"
      data-strokes={strokes.length}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onPointerOver={(e) => {
        if (e.pointerType === 'pen') penHere.current = true;
      }}
      className="relative h-64 w-full touch-none select-none overflow-hidden rounded-2xl border-2 border-line bg-canvas"
    >
      {under ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">{under}</div> : null}
      {/* the line the letters stand on, for the eye only: the check does not read it */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-[72%] border-t border-dashed border-line" />
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-fg">
        {[...strokes, ...(drawing ? [drawing] : [])].map((stroke, i) =>
          stroke.length === 1 ? (
            <circle key={i} data-ink cx={stroke[0].x} cy={stroke[0].y} r={3} fill="currentColor" />
          ) : (
            <polyline key={i} data-ink points={polyline(stroke)} fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          ),
        )}
      </svg>
    </div>
  );
}
