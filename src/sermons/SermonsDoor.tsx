// src/sermons/SermonsDoor.tsx — the quiet door 'Sermons · N' (mw-qtu3zvz.2, docs/sermons.md): a 44 px button that opens the Sermons sheet for a place, drawn only while the place has sermons. N is the number of rows
// of the chapter's sermons (src/sermons/useSermons.ts): the bundled ones and, once the sermon index service has answered for the chapter (one ask, kept), its rows too (mw-qtu3zvz.63). It sits in the Verse view's tools line after Maps, never in the verse text.
// Where no sermon is listed and a Logos sermon book is On, the door is 'Sermons' with no number (mw-qtu3zvz.92, docs/design/sermon-sources.md section 12): a sermon book opens only through this door, so a place
// no list reaches must still have one; its sheet says 'No sermons here.' above In Logos. The number stays what it was: listed sermons.
import { openSermons } from './openSermons';
import type { SermonPlace } from './types';
import { useArchives, useSermonsWithLatest } from './useSermons';

const DOOR = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line';
/** The quiet look of the Verse view's tools line (mw-5r3p30.896): accent words with no border. */
const QUIET_DOOR = 'inline-flex min-h-11 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-accent active:bg-line';

export function SermonsDoor({ place, className = '', quiet = false }: { place: SermonPlace; className?: string; quiet?: boolean }) {
  const found = useSermonsWithLatest(place);
  if (found === undefined) return null;
  const count = found.here.length + found.chapter.length;
  // nothing listed: his shelf is read only now, for the door of a Logos sermon book that opens at the place
  if (count === 0) return <BooksDoor place={place} look={`${quiet ? QUIET_DOOR : DOOR} ${className}`} />;
  return (
    <button type="button" aria-haspopup="dialog" data-sermons-door onClick={() => openSermons(place)} className={`${quiet ? QUIET_DOOR : DOOR} ${className}`}>
      {`Sermons · ${count}`}
    </button>
  );
}

/** The door with no number: drawn where no sermon is listed and a Logos sermon book that is On opens at the place. */
function BooksDoor({ place, look }: { place: SermonPlace; look: string }) {
  const books = useArchives(place);
  if (books === undefined || books.length === 0) return null;
  return (
    <button type="button" aria-haspopup="dialog" data-sermons-door onClick={() => openSermons(place)} className={look}>
      Sermons
    </button>
  );
}
