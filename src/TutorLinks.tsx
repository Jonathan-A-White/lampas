// src/TutorLinks.tsx — the links of a Bible talk answer (mw-5r3p30.75), drawn under the answer: for each word or verse the tutor linked, a group of chips
// that open it in the study resources he switched on in Settings (src/resources/tutorLinks.ts), and, for a verse, in Lampas's own Reader. A link to a resource
// he has not switched on is not drawn, a link to a work of his Logos library (mw-5r3p30.675) is one Open in Logos chip, and only for a work he ticked, a link to a setting (mw-5r3p30.502) is one chip that opens Settings at that row (src/settings/link.ts; a key the registry lacks draws nothing), and a link with no chip at all leaves no group; with nothing to show the whole list is absent. A word's Strong's number
// comes from the lexicon (src/data/lexicon.ts), never from the tutor.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import type { AnswerLink } from './data/db';
import { lookupLemma } from './data/lexicon';
import { getLogosBible, getStudyResources, getWorks, setResourceOn, shelfOf } from './data/repositories';
import { openReader } from './nav/route';
import { rowOf } from './settings/rows';
import { openSetting, settingLink } from './settings/link';
import { MAX_LINKS } from './services/talk';
import { armFallback } from './resources/openApp';
import { hebrewLinkLemma, mapChip, placeOf, verseChips, wordChips, workChip, type LinkChip } from './resources/tutorLinks';
import { openMaps } from './maps/openMaps';
import { useMaps } from './maps/useMaps';
import type { MapRef } from './maps/types';
import type { StudyResource } from './resources';
import { useGreekInterest } from './settings/useGreekInterest';
import { AppMissingSheet } from './WordSheet';
import { AnotherBookButton } from './library/InLogosDoors';
import { faceOf } from './script/greekLang';

/** The Strong's number of each linked lemma, from the lexicon; '' for a lemma it lacks or when it cannot be loaded. Undefined until they are looked up. */
function useStrongs(lemmas: string[]): Record<string, string> | undefined {
  const key = lemmas.join('|');
  const [found, setFound] = useState<{ key: string; strongs: Record<string, string> }>();
  useEffect(() => {
    let live = true;
    // a Hebrew lemma is asked of the Hebrew lexicon, a Greek one of the Greek (mw-gdcyf98.20)
    void Promise.all(lemmas.map(async (lemma) => [lemma, (await lookupLemma(lemma, hebrewLinkLemma(lemma) ? 'hbo' : 'grc').catch(() => undefined))?.s ?? ''] as const)).then((pairs) => {
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
  /** what the group is about: the lemma in Greek type (or Hebrew, `hebrew`), or the reference */
  name: string;
  greek: boolean;
  /** a Hebrew lemma: drawn right to left in the Hebrew face, with a chip that opens its word sheet in Lampas */
  hebrew?: boolean;
  /** the Reader chip of a verse link */
  reader?: { book: string; chapter: number; verse?: number };
  /** a verse link: the second door, In another book, opens the chooser of his Logos shelf at the place */
  place?: { book: string; chapter: number; verse?: number };
  /** the key of a setting link: its chip opens Settings at that row */
  setting?: string;
  /** a map link: its chip opens that map in the app (openMaps), or, for a card of a link-only source (`open`), is a link to it */
  map?: { id: string; label: string; open?: { url: string; fallback?: string } };
  chips: LinkChip[];
}

/** The chips under an answer. `onLeave` closes the Talk sheet before the Reader opens a verse. `onWord` opens the word sheet of a Hebrew lemma over the Talk sheet (the Word chip is drawn only with it). `place` is the chapter the talk is about (none in a talk from a screen): a `map` link is drawn only for a map of it. */
export function TutorLinks({ links, onLeave, onWord, place }: { links: AnswerLink[]; onLeave: () => void; onWord?: (lemma: string) => void; place?: MapRef }) {
  const chosen = useLiveQuery(getStudyResources, []);
  const bible = useLiveQuery(getLogosBible, []);
  const works = useLiveQuery(getWorks, []);
  const shelf = useLiveQuery(shelfOf, []);
  const level = useGreekInterest();
  const shown = links.slice(0, MAX_LINKS);
  // the maps of the chapter are read only for an answer that links one
  const mapCards = useMaps(place && shown.some((l) => l.kind === 'map') ? place : null);
  const strongs = useStrongs(shown.flatMap((l) => (l.kind === 'word' ? [l.lemma.normalize('NFC')] : [])));
  const [missing, setMissing] = useState<StudyResource | null>(null);
  if (!chosen || bible === undefined || works === undefined || shelf === undefined || !strongs || level === undefined) return null;
  if (place && shown.some((l) => l.kind === 'map') && mapCards === undefined) return null;

  const groups: Group[] = [];
  for (const [i, link] of shown.entries()) {
    if (link.kind === 'word') {
      const lemma = link.lemma.normalize('NFC');
      const hebrew = hebrewLinkLemma(lemma);
      groups.push({ key: `${i}`, name: lemma, greek: !hebrew, hebrew, chips: wordChips(lemma, strongs[lemma] || undefined, chosen, level) });
    } else if (link.kind === 'setting') {
      const row = settingLink(link.key) ? rowOf(link.key) : undefined;
      if (row) groups.push({ key: `${i}`, name: row.label, greek: false, setting: row.key, chips: [] });
    } else if (link.kind === 'map') {
      const found = place && mapCards ? mapChip(link.map, mapCards) : null;
      if (found) groups.push({ key: `${i}`, name: found.card.title, greek: false, map: { id: found.card.id, label: found.label, open: found.card.open }, chips: [] });
    } else if (link.kind === 'work') {
      const found = workChip(link.work, link.reference, works, link.place, level, shelf.map((row) => row.id));
      if (found) groups.push({ key: `${i}`, name: found.name, greek: false, chips: [found.chip] });
    } else {
      const place = placeOf(link.reference);
      if (place) groups.push({ key: `${i}`, name: place.name, greek: false, reader: place.reader ? place : undefined, place, chips: verseChips(place, place.name, chosen, bible, level) });
    }
  }
  const drawn = groups.filter((g) => g.reader || g.setting || g.map || (g.hebrew && onWord) || g.chips.length > 0);
  if (drawn.length === 0) return null;

  return (
    <>
      <ul data-tutor-links aria-label="Study links" className="mt-2 space-y-2 border-t border-line pt-2">
        {drawn.map((group) => (
          <li key={group.key} data-tutor-link role="group" aria-label={group.name} className="flex flex-wrap items-center gap-2">
            {group.hebrew ? (
              <span {...faceOf('hbo', { greek: '', hebrew: 'hebrew-choice' }, 'mr-1 break-words')}>{group.name}</span>
            ) : (
              <span {...(group.greek ? faceOf('grc', { greek: 'text-2xl', hebrew: '' }, 'mr-1 break-words') : { className: 'mr-1 break-words text-base font-medium' })}>{group.name}</span>
            )}
            {group.hebrew && onWord ? (
              <button
                type="button"
                aria-label={`Open ${group.name} in Lampas`}
                onClick={() => onWord(group.name)}
                className={CHIP}
              >
                Word
              </button>
            ) : null}
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
            {group.setting ? (
              <button
                type="button"
                aria-label={`Open ${group.name} in Settings`}
                onClick={() => {
                  onLeave();
                  openSetting(group.setting as string);
                }}
                className={CHIP}
              >
                Settings
              </button>
            ) : null}
            {group.map?.open ? (
              <a
                href={group.map.open.url}
                aria-label={group.map.label}
                data-fallback={group.map.open.fallback}
                onClick={group.map.open.fallback ? () => armFallback((group.map as NonNullable<Group['map']>).open?.fallback) : undefined}
                {...(group.map.open.url.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}
                className={CHIP}
              >
                Map ↗
              </a>
            ) : group.map && place ? (
              <button
                type="button"
                aria-label={group.map.label}
                onClick={() => {
                  onLeave();
                  openMaps({ book: place.book, chapter: place.chapter }, (group.map as NonNullable<Group['map']>).id);
                }}
                className={CHIP}
              >
                Map
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
            {group.place ? <AnotherBookButton place={group.place} name={group.name} label="In another book" className={CHIP} /> : null}
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
