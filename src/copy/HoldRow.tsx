// src/copy/HoldRow.tsx — the quiet row a hold on a verse number draws (mw-5r3p30.1074, his words and tap A of 2026-11-05): what was copied ('Copied Hebrews 9:11') and, under it, the ends that
// differ (Verse, Paragraph, Pericope, Chapter: a tap copies from the held verse to that end, the current one marked) and Share. It is a fixed strip above the foot of the screen: it moves no line of the
// Reader, dims nothing and has no close button (it goes by itself, ROW_MS after the last touch, src/copy/useCopyHold.ts). It holds no control for the tutor: the question mark is his one door.
import type { EndUnit } from './holdEnds';
import type { HoldRowState } from './useCopyHold';

const END =
  'min-h-11 shrink-0 rounded-lg px-1.5 text-sm font-medium active:bg-line';

export function HoldRow({ row, onReach, onShare, onTouch }: { row: HoldRowState; onReach: (unit: EndUnit) => void; onShare: () => void; onTouch: () => void }) {
  return (
    <div data-copy-row onPointerDown={onTouch} className="copy-row fixed inset-x-3 z-20 rounded-xl border border-line bg-surface px-1 pb-0.5 pt-1.5 shadow-lg">
      <p role="status" data-copied className="truncate px-1.5 text-sm text-fg">
        {row.said}
      </p>
      <div role="group" aria-label="Copy as far as" className="flex items-center whitespace-nowrap">
        {row.ends.map((end) => (
          <button
            key={end.unit}
            type="button"
            aria-pressed={end.unit === row.unit}
            data-end={end.unit}
            onClick={() => onReach(end.unit)}
            className={`${END} ${end.unit === row.unit ? 'bg-accent/15 text-accent' : 'text-muted'}`}
          >
            {end.label}
          </button>
        ))}
        <button type="button" data-share onClick={onShare} className={`${END} ms-auto text-accent`}>
          Share
        </button>
      </div>
    </div>
  );
}
