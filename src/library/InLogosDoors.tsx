// src/library/InLogosDoors.tsx — the two doors of a verse in his Logos library (docs/design/library-at-scale.md 3.6, mw-rfjjzd.9). 'In Logos' keeps opening the verse in his Bible in Logos
// (Settings > Bible in Logos); 'In another book…' opens the chooser (InLogosChooser.tsx) and is drawn only while Logos is On and a Greek text, an interlinear or a commentary that covers the
// book is On. Each door is also drawn alone (the tutor's verse chip row, Today, the reference card have the Bible door of their own already and take only the second).
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getLogosBible, getStudyResources } from '../data/repositories';
import { CATALOGUE, type CatalogueEntry } from '../resources/catalogue';
import { verseLink } from '../resources/logosBible';
import { armFallback } from '../resources/openApp';
import type { StudyPlace } from '../resources/types';
import { InLogosChooser } from './InLogosChooser';
import { hasAnotherBook } from './inLogos';
import { useInLogosRows } from './useInLogosRows';

const DOOR = 'inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line';

interface DoorProps {
  place: StudyPlace;
  /** the place as it is written: 'Romans 8:31' */
  name: string;
  entries?: readonly CatalogueEntry[];
}

/** 'In another book…': a button that opens the chooser; nothing while Logos is Off or no book other than his Bible opens at the place. `label` and `className` let a chip row set its own. */
export function AnotherBookButton({ place, name, entries = CATALOGUE, label = 'In another book…', className = DOOR }: DoorProps & { label?: string; className?: string }) {
  const logos = useLiveQuery(async () => (await getStudyResources()).on.includes('logos'), []);
  const rows = useInLogosRows(place, entries);
  const [open, setOpen] = useState(false);
  if (!logos || !rows || !hasAnotherBook(rows)) return null;
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open ? <InLogosChooser place={place} name={name} entries={entries} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** 'In Logos' (his Bible at the place) and, beside it, 'In another book…'; nothing at all while Logos is Off. */
export function InLogosDoors({ place, name, entries, className = '' }: DoorProps & { className?: string }) {
  const logos = useLiveQuery(async () => (await getStudyResources()).on.includes('logos'), []);
  const bible = useLiveQuery(getLogosBible, []);
  if (!logos || bible === undefined) return null;
  const link = verseLink(place.book, place.chapter, place.verse, bible);
  return (
    <div role="group" aria-label={`${name} in Logos`} data-in-logos className={`grid grid-cols-2 gap-1 ${className}`}>
      {link ? (
        <a href={link.url} data-fallback={link.fallback} onClick={() => armFallback(link.fallback)} className={DOOR}>
          In Logos<span aria-hidden="true">&nbsp;↗</span>
        </a>
      ) : null}
      <AnotherBookButton place={place} name={name} entries={entries} className={`${DOOR} ${link ? '' : 'col-span-2'}`} />
    </div>
  );
}
