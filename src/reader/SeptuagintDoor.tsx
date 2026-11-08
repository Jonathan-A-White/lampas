// src/reader/SeptuagintDoor.tsx — the door under the Reader's "not ready yet" line while Settings > Old Testament in Greek (Septuagint) is On (mw-u2w5klk.266): it opens the chapter in the Septuagint he chose in Logos
// (Settings > Bible in Logos > Septuagint, Swete's Greek to start) as 'Read it in Logos: LXX Swete', a link of the Logos app's own scheme with the ref.ly address armed as the fallback (openApp.ts), as a commentary's
// door is. With Logos not linked the line stands and the door says where to link it, as the Apocrypha's card does (markdown/ReferenceCard.tsx).
import { useLiveQuery } from 'dexie-react-hooks';
import { getLogosBibles, getStudyResources } from '../data/repositories';
import { entryOf } from '../resources/catalogue';
import { septuagintLink } from '../resources/logosBible';
import { armFallback } from '../resources/openApp';
import { openSettingsSection } from '../settings/link';

export function SeptuagintDoor({ book, chapter }: { book: string; chapter: number }) {
  const resources = useLiveQuery(getStudyResources, []);
  const bibles = useLiveQuery(getLogosBibles, []);
  if (resources === undefined || bibles === undefined) return null;
  const link = septuagintLink(book, chapter, bibles.septuagint);
  const logosOn = resources.on.includes('logos');
  if (logosOn && link)
    return (
      <a
        href={link.url}
        data-fallback={link.fallback}
        data-septuagint-door
        onClick={() => armFallback(link.fallback)}
        className="mx-auto mt-1 inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-base font-medium text-accent active:bg-line"
      >
        Read it in Logos: {entryOf(bibles.septuagint)?.short ?? bibles.septuagint}
      </a>
    );
  if (logosOn) return null;
  return (
    <p className="chrome-small text-muted">
      <a
        href="#/settings?section=resources"
        onClick={(e) => {
          e.preventDefault();
          openSettingsSection('resources');
        }}
        className="inline-flex min-h-11 items-center text-accent underline"
      >
        Link Logos in Settings
      </a>{' '}
      to read it there.
    </p>
  );
}
