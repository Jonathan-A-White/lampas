// src/data/repositories/diagrams.ts — the sentence diagrams the tutor drew, kept (mw-souyao.2): one row per verse or passage, mode and grind version, in the Dexie `diagrams` table. The ONLY file that
// reads or writes that table. A diagram is kept once it has passed validateDiagram (src/diagram/fetchDiagram.ts), so a row is always one that can be drawn; a second keep of the same place replaces the first.
import { db, type DiagramRow } from '../db';
import type { Diagram, DiagramMode } from '../../diagram/types';

export type { DiagramRow };

/** The sentence-diagram grind's version (grinds/sentence-diagram.json `versions`), which a kept diagram is keyed by: a later version of the grind draws and keeps its own. */
export const DIAGRAM_VERSION = '1';

/**
 * Verses whose kept tree is no longer right, each with the mark a unit holding it is kept under from the fix on: a row kept before (under the bare version) is never read
 * again, so the unit is asked for once more and the new tree kept under the mark. Every other diagram stays kept. `modes` are the modes the mark applies to (none: both).
 * Colossians 3:2 hung μὴ on φρονεῖτε, the stated verb, not on τὰ ἐπὶ τῆς γῆς (mw-5r3p30.800).
 * 1 John 2:1 hung the vocative Τεκνία μου on γράφω as a modifier; a vocative now stands on its own line above the base line (mw-5r3p30.1227, mw-5r3p30.1237). Every other verse that holds a
 * vocative is marked by what it holds, not here: keptVersion (below) adds VOCATIVE_MARK to the version of a unit with an N-V or A-V word (mw-5r3p30.1251).
 * The RP 2026 overlay (data/rp2026-overlay.json) moved or changed the Greek words of Matthew 26:29, Philemon 1:1 and Revelation 13:14, and a Greek-mode row holds the verse's word
 * indexes (mw-9ji6ek0.9); an English row holds the English chunks' indexes, which the overlay kept. tests/unit/diagrams-redrawn.test.ts fails on an overlay entry with no mark here.
 * `moved` is set where the overlay moved or removed a word, so that any Greek word index of the verse kept before is stale: a kept Greek reading holds such indexes too, and
 * src/data/repositories/readings.ts keeps one under the mark from then on (mw-9ji6ek0.11). tests/unit/readings-redrawn.test.ts fails on an overlay entry that moves a word and is not marked so.
 */
export const REDRAWN: { book: string; chapter: number; verse: number; mark: string; modes?: DiagramMode[]; moved?: true }[] = [
  { book: 'Colossians', chapter: 3, verse: 2, mark: 'col-3-2' },
  { book: '1 John', chapter: 2, verse: 1, mark: 'voc-1jn-2-1' },
  { book: 'Matthew', chapter: 26, verse: 29, mark: 'rp2026-mat-26-29', modes: ['greek'] },
  { book: 'Philemon', chapter: 1, verse: 1, mark: 'rp2026-phm-1-1', modes: ['greek'], moved: true },
  { book: 'Revelation', chapter: 13, verse: 14, mark: 'rp2026-rev-13-14', modes: ['greek'], moved: true },
];

/**
 * The mark of a unit that holds a vocative (mw-5r3p30.1251): a tree kept before mw-5r3p30.1227 drew a vocative on its own line hung it on the verb, so no row kept under the bare version
 * of such a unit is read; it is drawn again and kept under this mark. Not a list of verses: any unit with a vocative word, so the next drawing fix that reads a word's parse needs no entry per verse.
 */
export const VOCATIVE_MARK = 'voc';

/** Whether a unit's words hold a vocative: a noun (N-V...) or an adjective (A-V...) in the vocative case, by the parse code the Greek data carries. The same words the tutor is sent. */
export const holdsVocative = (parses: Iterable<string | undefined>): boolean => [...parses].some((p) => p !== undefined && /^[NA]-V/.test(p));

/**
 * The version a unit's diagram is kept under: the grind's, marked when the unit ('Colossians 3:2', 'Colossians 3:1-2') holds a verse of REDRAWN that applies in this mode,
 * and with VOCATIVE_MARK when `vocative` (the caller knows the unit's words; this file knows only its reference).
 */
export function keptVersion(ref: string, lang: DiagramMode, vocative = false): string {
  const unit = /^(.+) (\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  const marks = !unit ? [] : REDRAWN.filter((r) => (r.modes ?? [lang]).includes(lang) && r.book === unit[1] && r.chapter === Number(unit[2]) && r.verse >= Number(unit[3]) && r.verse <= Number(unit[4] ?? unit[3])).map((r) => r.mark);
  return [DIAGRAM_VERSION, ...marks, ...(vocative && lang !== 'hebrew' ? [VOCATIVE_MARK] : [])].join('+');
}

/** The diagram kept for this place in this mode, or undefined when none is. */
export async function getDiagram(ref: string, lang: DiagramMode, version: string = keptVersion(ref, lang)): Promise<Diagram | undefined> {
  return (await db.diagrams.get([ref, lang, version]))?.diagram;
}

/** Keeps the diagram for this place in this mode, in place of any kept before. */
export async function keepDiagram(ref: string, lang: DiagramMode, diagram: Diagram, at: number = Date.now(), version: string = keptVersion(ref, lang)): Promise<void> {
  await db.diagrams.put({ ref, lang, version, diagram, at });
}
