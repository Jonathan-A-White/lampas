// src/TutorLinks.tsx — the links of a Bible talk answer (mw-5r3p30.75), drawn under the answer: for each word or verse the tutor linked, a group of chips
// that open it in the study resources he switched on in Settings (src/resources/tutorLinks.ts), and, for a verse, in Lampas's own Reader. A link to a resource
// he has not switched on is not drawn, and a link with no chip at all leaves no group; with nothing to show the whole list is absent. A word's Strong's number
// comes from the lexicon (src/data/lexicon.ts), never from the tutor.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BOOK_INDEX } from './data/bookIndex';
import { titleOf } from './data/books';
import type { AnswerLink } from './data/db';
import { lookupLemma } from './data/lexicon';
import { getLogosBible, getStudyResources, setResourceOn } from './data/repositories';
import { openReader } from './nav/route';
import { parseReference } from './nav/links';
import { MAX_LINKS } from './services/talk';
import { armFallback } from './resources/openApp';
import { verseChips, wordChips, type LinkChip } from './resources/tutorLinks';
import type { StudyResource } from './resources';
import { AppMissingSheet } from './WordSheet';

/** The place a verse link names, when Lampas holds it: the book, the chapter and the verse (none for a whole chapter), and its name as Lampas writes it. */
function placeOf(reference: string): { book: string; chapter: number; verse?: number; name: string } | null {
  const parsed = parseReference(reference);
  const info = parsed && BOOK_INDEX.books.find((b) => b.code === parsed.book);
  if (!parsed || !info || parsed.chapter === undefined || parsed.chapter < 1 || parsed.chapter > info.chapters) return null;
  const { book, chapter, verse } = parsed;
  if (verse !== undefined && (verse < 1 || verse > (info.verses[chapter - 1] ?? 0))) return null;
  return { book, chapter, ...(verse === undefined ? {} : { verse }), name: verse === undefined ? titleOf(book, chapter) : `${titleOf(book, chapter)}:${verse}` };
}

/** The Strong's number of each linked lemma, from the lexicon; '' for a lemma it lacks or when it cannot be loaded. Undefined until they are looked up. */
function useStrongs(lemmas: string[]): Record<string, string> | undefined {
  const key = lemmas.join('|');
  const [found, setFound] = useState<{ key: string; strongs: Record<string, string> }>();
  useEffect(() => {
    let live = true;
    void Promise.all(lemmas.map(async (lemma) => [lemma, (await lookupLemma(lemma).catch(() => undefined))?.s ?? ''] as const)).then((pairs) => {
      if (live) setFound({ key, strongs: Object.fromEntries(pairs) });
    });
    return () => {
      live = false;
    };
    // `key` stands for `lemmas`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return found?.key === key ? found.strongs : undefined;
}

const CHIP = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line px-3 text-base font-medium text-accent active:bg-line';

interface Group {
  key: string;
  /** what the group is about: the lemma in Greek type, or the reference */
  name: string;
  greek: boolean;
  /** the Reader chip of a verse link */
  reader?: { book: string; chapter: number; verse?: number };
  chips: LinkChip[];
}

/** The chips under an answer. `onLeave` closes the Talk sheet before the Reader opens a verse. */
export function TutorLinks({ links, onLeave }: { links: AnswerLink[]; onLeave: () => void }) {
  const chosen = useLiveQuery(getStudyResources, []);
  const bible = useLiveQuery(getLogosBible, []);
  const shown = links.slice(0, MAX_LINKS);
  const strongs = useStrongs(shown.flatMap((l) => (l.kind === 'word' ? [l.lemma.normalize('NFC')] : [])));
  const [missing, setMissing] = useState<StudyResource | null>(null);
  if (!chosen || bible === undefined || !strongs) return null;

  const groups: Group[] = [];
  for (const [i, link] of shown.entries()) {
    if (link.kind === 'word') {
      const lemma = link.lemma.normalize('NFC');
      groups.push({ key: `${i}`, name: lemma, greek: true, chips: wordChips(lemma, strongs[lemma] || undefined, chosen) });
    } else {
      const place = placeOf(link.reference);
      if (place) groups.push({ key: `${i}`, name: place.name, greek: false, reader: place, chips: verseChips(place, place.name, chosen, bible) });
    }
  }
  const drawn = groups.filter((g) => g.reader || g.chips.length > 0);
  if (drawn.length === 0) return null;

  return (
    <>
      <ul data-tutor-links aria-label="Study links" className="mt-2 space-y-2 border-t border-line pt-2">
        {drawn.map((group) => (
          <li key={group.key} data-tutor-link role="group" aria-label={group.name} className="flex flex-wrap items-center gap-2">
            <span lang={group.greek ? 'grc' : undefined} className={`mr-1 break-words ${group.greek ? 'font-greek text-2xl' : 'text-base font-medium'}`}>
              {group.name}
            </span>
            {group.reader ? (
              <button
                type="button"
                aria-label={`Open ${group.name} in Lampas`}
                onClick={() => {
                  const { book, chapter, verse } = group.reader as NonNullable<Group['reader']>;
                  onLeave();
                  openReader({ book, chapter, verse });
                }}
                className={CHIP}
              >
                Reader
              </button>
            ) : null}
            {group.chips.map((chip) => (
              <a
                key={chip.label}
                href={chip.url}
                aria-label={chip.label}
                data-fallback={chip.fallback}
                onClick={chip.resource.kind === 'app' ? () => armFallback(chip.fallback, undefined, () => setMissing(chip.resource)) : undefined}
                {...(chip.url.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}
                className={CHIP}
              >
                {chip.tile}
              </a>
            ))}
          </li>
        ))}
      </ul>
      {missing ? (
        <AppMissingSheet
          app={missing.name}
          onClose={() => setMissing(null)}
          onTurnOff={() => {
            void setResourceOn(missing.id, false);
            setMissing(null);
          }}
        />
      ) : null}
    </>
  );
}
