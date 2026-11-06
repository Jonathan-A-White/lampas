// src/sermons/SermonsDoor.tsx — the quiet door 'Sermons · N' (mw-qtu3zvz.2, docs/sermons.md): a 44 px button that opens the Sermons sheet for a place, drawn only while the place has sermons. N is the number of rows
// of the chapter's sermons (src/sermons/useSermons.ts); nothing but the module's own data is read to know it. It sits in the Verse view's tools line after Maps, never in the verse text.
import { openSermons } from './openSermons';
import type { SermonPlace } from './types';
import { useSermons } from './useSermons';

const DOOR = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line';
/** The quiet look of the Verse view's tools line (mw-5r3p30.896): accent words with no border. */
const QUIET_DOOR = 'inline-flex min-h-11 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-accent active:bg-line';

export function SermonsDoor({ place, className = '', quiet = false }: { place: SermonPlace; className?: string; quiet?: boolean }) {
  const found = useSermons(place);
  const count = found ? found.here.length + found.chapter.length : 0;
  if (count === 0) return null;
  return (
    <button type="button" aria-haspopup="dialog" data-sermons-door onClick={() => openSermons(place)} className={`${quiet ? QUIET_DOOR : DOOR} ${className}`}>
      {`Sermons · ${count}`}
    </button>
  );
}
