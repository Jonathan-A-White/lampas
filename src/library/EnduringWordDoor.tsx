// src/library/EnduringWordDoor.tsx — the Verse view's 'Commentary' door (mw-1l901so.1): David Guzik's Enduring Word commentary on the web (src/resources/enduringWord.ts), for a verse whose book his Logos library
// cannot open a book at: Logos Off, or no library, or a library with none of the books the 'In another book…' chooser lists. Where that chooser opens it already carries Enduring Word among the commentaries
// (where he has no DGCB volume of the book), so the door is not drawn beside it. A tap opens the chapter's page in Lampas's reader, which opens the browser when it cannot get the page's words.
import { useLiveQuery } from 'dexie-react-hooks';
import { getStudyResources } from '../data/repositories';
import { CATALOGUE, type CatalogueEntry } from '../resources/catalogue';
import { enduringWordUrl, openEnduringWord } from '../resources/enduringWord';
import type { StudyPlace } from '../resources/types';
import { hasAnotherBook } from './inLogos';
import { useInLogosRows } from './useInLogosRows';

/** The quiet look of the Verse view's tools line (mw-5r3p30.896): accent words with no border. */
const QUIET_DOOR = 'inline-flex min-h-11 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-accent active:bg-line';

export function EnduringWordDoor({ place, entries = CATALOGUE }: { place: StudyPlace; entries?: readonly CatalogueEntry[] }) {
  const logos = useLiveQuery(async () => (await getStudyResources()).on.includes('logos'), []);
  const rows = useInLogosRows(place, entries);
  const url = enduringWordUrl(place.book, place.chapter, place.verse);
  // nothing is drawn until the shelf is read; with Logos On and a book that opens at the verse the chooser has the row
  if (url === undefined || logos === undefined || rows === undefined || (logos && hasAnotherBook(rows))) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-enduring-word-door
      onClick={(e) => {
        e.preventDefault();
        openEnduringWord(place);
      }}
      className={QUIET_DOOR}
    >
      Commentary
    </a>
  );
}
