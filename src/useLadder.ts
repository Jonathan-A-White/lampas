// src/useLadder.ts — what the reading ladder (src/ReadingLadder.tsx, docs/reading-ladder.md) is doing for one verse of the Verse view.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { ladderPlace, loadLadder, positionOf, type LadderEntry, type LadderLang } from './data/readingLadder';
import { getLadderRow, listWellRead } from './data/repositories';

/** What the ladder is doing for a verse of the Verse view: whether it has this verse on screen, and where that is on the list. */
export interface LadderHere {
  onLadder: boolean;
  /** the N of 'Verse N of M', and M; 0 until the list has loaded */
  n: number;
  m: number;
  /** the verse to read now (the one 'Next verse' opens), null when every verse is read well */
  place: string | null;
}

/** The ladder of `lang` for the verse `ref` ('rom.8.28'): the list is fetched only when the ladder has this verse on screen. */
export function useLadder(lang: LadderLang | undefined, ref: string): LadderHere {
  const row = useLiveQuery(() => (lang ? getLadderRow(lang) : undefined), [lang]);
  const wellAt = useLiveQuery(() => (lang ? listWellRead(lang) : undefined), [lang]);
  const onLadder = lang !== undefined && row?.showing === ref;
  const [list, setList] = useState<{ lang: LadderLang; entries: LadderEntry[] } | null>(null);
  useEffect(() => {
    if (!lang || !onLadder) return;
    let live = true;
    loadLadder(lang).then(
      (entries) => live && setList({ lang, entries }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [lang, onLadder]);
  const entries = list && list.lang === lang ? list.entries : undefined;
  if (!onLadder || !entries || !row || !wellAt) return { onLadder, n: 0, m: 0, place: null };
  return { onLadder, n: positionOf(entries, ref), m: entries.length, place: ladderPlace(entries, wellAt, row.skipped) };
}
