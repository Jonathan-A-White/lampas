// src/TutorLinks.tsx — the links of a Bible talk answer (mw-5r3p30.75), drawn under the answer: for each word or verse the tutor linked, a group of chips
// that open it in the study resources he switched on in Settings (src/resources/tutorLinks.ts), and, for a verse, in Lampas's own Reader. A link to a resource
// he has not switched on is not drawn, a link to a work of his Logos library (mw-5r3p30.675) is one Open in Logos chip, and only for a work he ticked, a link to a setting (mw-5r3p30.502) is one chip that opens Settings at that row (src/settings/link.ts; a key the registry lacks draws nothing), and a link with no chip at all leaves no group; with nothing to show the whole list is absent. A word's Strong's number
// comes from the lexicon (src/data/lexicon.ts), never from the tutor.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import type { AnswerLink } from './data/db';
import { lookupLemma, lookupSeptuagintLemma } from './data/lexicon';
import { getLogosBibles, getStudyResources, getWorks, setResourceOn, shelfOf } from './data/repositories';
import { openParadigm, openReader, paradigmHash } from './nav/route';
import { paradigmById } from './data/paradigms';
import { holdTalk } from './talkReturn';
import { rowOf } from './settings/rows';
import { openSetting, settingLink } from './settings/link';
import { MAX_LINKS, type TalkScope } from './services/talk';
import { bibleFor } from './resources/logosBible';
import { armFallback } from './resources/openApp';
import { openedRow } from './sermons/merge';
import { opensNewTab, rowHref, useOpenWebIn } from './sermons/openWeb';
import { onAndroid } from './openInApp';
import { copyChip, hebrewLinkLemma, mapChip, placeOf, sermonChip, verseChips, wordChips, workChip, type LinkChip } from './resources/tutorLinks';
import { openMaps } from './maps/openMaps';
import { useMaps } from './maps/useMaps';
import { useTalkSermons } from './sermons/useSermons';
import type { MapRef } from './maps/types';
import type { StudyResource } from './resources';
import { useGreekInterest } from './settings/useGreekInterest';
import { AppMissingSheet } from './WordSheet';
import { AnotherBookButton } from './library/InLogosDoors';
import { faceOf } from './script/greekLang';
import { COPIED_MS } from './copy/useCopyHold';
import { rangeCopy, readCopyFormat, readerReadOf, UnreadableChapter, type CopyRange } from './copy/rangeText';
import type { RangeCopy } from './copy/format';
import { copy } from './ui/clipboard';

/** The Strong's number of each linked lemma, from the lexicon; '' for a lemma it lacks or when it cannot be loaded. Undefined until they are looked up. */
function useStrongs(lemmas: string[]): Record<string, string> | undefined {
  const key = lemmas.join('|');
  const [found, setFound] = useState<{ key: string; strongs: Record<string, string> }>();
  useEffect(() => {
    let live = true;
    // a Hebrew lemma is asked of the Hebrew lexicon, a Greek one of the Greek (mw-gdcyf98.20), and a Greek one that lexicon lacks of the Septuagint's while that is On (mw-u2w5klk.16)
    const strongsOf = async (lemma: string): Promise<string> => {
      const hebrew = hebrewLinkLemma(lemma);
      const entry = (await lookupLemma(lemma, hebrew ? 'hbo' : 'grc').catch(() => undefined)) ?? (hebrew ? undefined : await lookupSeptuagintLemma(lemma).catch(() => undefined));
      return entry?.s ?? '';
    };
    void Promise.all(lemmas.map(async (lemma) => [lemma, await strongsOf(lemma)] as const)).then((pairs) => {
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

/** What the copy chip says of its last tap, for COPIED_MS. */
type CopySaid = { text: string; label: string } | null;

/** The chip of a copy or share link (mw-5r3p30.1075): one tap puts the text of the range on the clipboard ('Copied'), or opens the phone's share sheet with it, and the Talk sheet stays open. The text is made as the chip is drawn
 *  (the chapters it touches are loaded then), so the tap itself waits for nothing: a phone's browser writes the clipboard and opens the share sheet only inside a tap. A chapter that cannot be read is said on the chip. */
function CopyChip({ kind, label, range }: { kind: 'copy' | 'share'; label: string; range: CopyRange }) {
  const [said, setSaid] = useState<CopySaid>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  const made = useRef<Promise<RangeCopy> | null>(null);
  const make = (): Promise<RangeCopy> => {
    const promise = Promise.all([readCopyFormat(), readerReadOf()]).then(([format, read]) => rangeCopy(range, format, { read }));
    // read at the tap, if it failed here
    promise.catch(() => undefined);
    made.current = promise;
    return promise;
  };
  useEffect(() => {
    alive.current = true;
    made.current = null;
    // `range` is parsed afresh each render: its name stands for it
    make();
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.name, range.book]);
  const say = (next: CopySaid) => {
    if (!alive.current) return;
    setSaid(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaid(null), COPIED_MS);
  };
  const copied = (note = '') => say({ text: `Copied${note}`, label: `Copied ${range.name}${note}` });
  const tap = async () => {
    let text: RangeCopy;
    try {
      text = await (made.current ?? make()).catch(() => make());
    } catch (error) {
      const failed = `Could not read ${error instanceof UnreadableChapter ? error.chapter : range.name}`;
      say({ text: failed, label: failed });
      return;
    }
    if (kind === 'share' && typeof navigator.share === 'function') {
      try {
        await navigator.share(text.share);
        return;
      } catch (error) {
        // he closed the sheet: nothing more to say
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    const note = kind === 'share' ? '. This phone cannot share' : '';
    if (await copy(text.text)) copied(note);
    else say({ text: `Could not copy ${range.name}`, label: `Could not copy ${range.name}` });
  };
  return (
    <button type="button" aria-label={said?.label ?? label} onClick={() => void tap()} className={CHIP}>
      {said?.text ?? (kind === 'copy' ? 'Copy' : 'Share')}
    </button>
  );
}

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
  /** a paradigm link: its chip opens that table (openParadigm) and holds the talk, so Back brings the sheet back */
  paradigm?: { id: string; name: string };
  /** a map link: its chip opens that map in the app (openMaps), or, for a card of a link-only source (`open`), is a link to it */
  map?: { id: string; label: string; open?: { url: string; fallback?: string } };
  /** a sermon link: its chip is a plain link to where the sermon lives (a Logos row arms its fallback), and does not close the Talk sheet */
  sermon?: { label: string; opensIn: 'web' | 'logos'; open: { url: string; fallback?: string } };
  /** a copy or share link: its chip puts the range's text on the clipboard or opens the share sheet, and does not close the Talk sheet */
  copy?: { kind: 'copy' | 'share'; label: string; range: CopyRange };
  chips: LinkChip[];
}

/** The chips under an answer. `onLeave` closes the Talk sheet before the Reader opens a verse. `onWord` opens the word sheet of a Hebrew lemma over the Talk sheet (the Word chip is drawn only with it). `place` is the chapter the talk is about (none in a talk from a screen): a `map` link is drawn only for a map of it. `scope` is the talk the links are under: a `paradigm` link holds it, so the sheet comes back when Back returns from the table (src/talkReturn.ts); without it the table opens and Back finds the screen. */
export function TutorLinks({ links, onLeave, onWord, place, verse, scope }: { links: AnswerLink[]; onLeave: () => void; onWord?: (lemma: string) => void; place?: MapRef; verse?: number; scope?: TalkScope }) {
  const chosen = useLiveQuery(getStudyResources, []);
  const bibles = useLiveQuery(getLogosBibles, []);
  const works = useLiveQuery(getWorks, []);
  const shelf = useLiveQuery(shelfOf, []);
  const level = useGreekInterest();
  // 'Open web sermons in' (openWeb.ts): the chip follows the choice the Sermons sheet does
  const openWeb = useOpenWebIn();
  const shown = links.slice(0, MAX_LINKS);
  // the maps of the chapter are read only for an answer that links one
  const mapCards = useMaps(place && shown.some((l) => l.kind === 'map') ? place : null);
  // the sermons the tutor was told of (the talk's verse, else its chapter) are read only for an answer that links one
  const sermonRows = useTalkSermons(place && shown.some((l) => l.kind === 'sermon') ? { book: place.book, chapter: place.chapter, ...(verse === undefined ? {} : { from: verse }) } : null);
  const strongs = useStrongs(shown.flatMap((l) => (l.kind === 'word' ? [l.lemma.normalize('NFC')] : [])));
  const [missing, setMissing] = useState<StudyResource | null>(null);
  if (!chosen || bibles === undefined || works === undefined || shelf === undefined || !strongs || level === undefined) return null;
  if (place && shown.some((l) => l.kind === 'map') && mapCards === undefined) return null;
  if (place && shown.some((l) => l.kind === 'sermon') && sermonRows === undefined) return null;

  const groups: Group[] = [];
  for (const [i, link] of shown.entries()) {
    if (link.kind === 'word') {
      const lemma = link.lemma.normalize('NFC');
      const hebrew = hebrewLinkLemma(lemma);
      groups.push({ key: `${i}`, name: lemma, greek: !hebrew, hebrew, chips: wordChips(lemma, strongs[lemma] || undefined, chosen, level) });
    } else if (link.kind === 'setting') {
      const row = settingLink(link.key) ? rowOf(link.key) : undefined;
      if (row) groups.push({ key: `${i}`, name: row.label, greek: false, setting: row.key, chips: [] });
    } else if (link.kind === 'paradigm') {
      // a table the Paradigms screen lacks draws nothing (the tutor was given the ids, but an id can be wrong)
      const table = paradigmById(link.table);
      if (table) groups.push({ key: `${i}`, name: table.name, greek: false, paradigm: { id: table.id, name: table.name }, chips: [] });
    } else if (link.kind === 'map') {
      const found = place && mapCards ? mapChip(link.map, mapCards) : null;
      if (found) groups.push({ key: `${i}`, name: found.card.title, greek: false, map: { id: found.card.id, label: found.label, open: found.card.open }, chips: [] });
    } else if (link.kind === 'sermon') {
      const found = place && sermonRows ? sermonChip(link.sermon, sermonRows) : null;
      if (found) groups.push({ key: `${i}`, name: found.row.title, greek: false, sermon: { label: found.label, opensIn: openedRow(found.row).opensIn, open: openedRow(found.row).open }, chips: [] });
    } else if (link.kind === 'copy' || link.kind === 'share') {
      // a reference Lampas has no text for (the Apocrypha, a chapter the book lacks) draws nothing
      const found = copyChip(link.kind, link.reference);
      if (found) groups.push({ key: `${i}`, name: found.range.name, greek: false, copy: { kind: link.kind, label: found.label, range: found.range }, chips: [] });
    } else if (link.kind === 'work') {
      // a work of his Logos library opens in Logos: nothing while Logos is Off
      const found = chosen.on.includes('logos') ? workChip(link.work, link.reference, works, link.place, level, shelf.map((row) => row.id)) : null;
      if (found) groups.push({ key: `${i}`, name: found.name, greek: false, chips: [found.chip] });
    } else {
      const place = placeOf(link.reference);
      if (place) groups.push({ key: `${i}`, name: place.name, greek: false, reader: place.reader ? place : undefined, place, chips: verseChips(place, place.name, chosen, bibleFor(place.book, bibles), level) });
    }
  }
  const drawn = groups.filter((g) => g.reader || g.setting || g.paradigm || g.map || g.sermon || g.copy || (g.hebrew && onWord) || g.chips.length > 0);
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
            {group.paradigm ? (
              <button
                type="button"
                aria-label={`Table: ${group.paradigm.name}`}
                onClick={() => {
                  const address = { table: (group.paradigm as NonNullable<Group['paradigm']>).id };
                  if (scope) holdTalk(scope, paradigmHash(address));
                  onLeave();
                  openParadigm(address);
                }}
                className={CHIP}
              >
                Table
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
            {group.sermon ? (
              <a
                href={rowHref(group.sermon, openWeb, onAndroid())}
                aria-label={group.sermon.label}
                data-fallback={group.sermon.open.fallback}
                onClick={group.sermon.open.fallback ? () => armFallback((group.sermon as NonNullable<Group['sermon']>).open.fallback) : undefined}
                {...(opensNewTab(rowHref(group.sermon, openWeb, onAndroid())) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={CHIP}
              >
                Sermon ↗
              </a>
            ) : null}
            {group.copy ? <CopyChip kind={group.copy.kind} label={group.copy.label} range={group.copy.range} /> : null}
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
