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
 * The RP 2026 overlay (data/rp2026-overlay.json) moved or changed the Greek words of Matthew 26:29, Philemon 1:1 and Revelation 13:14, and a Greek-mode row holds the verse's word
 * indexes (mw-9ji6ek0.9); an English row holds the English chunks' indexes, which the overlay kept. tests/unit/diagrams-redrawn.test.ts fails on an overlay entry with no mark here.
 */
export const REDRAWN: { book: string; chapter: number; verse: number; mark: string; modes?: DiagramMode[] }[] = [
  { book: 'Colossians', chapter: 3, verse: 2, mark: 'col-3-2' },
  { book: 'Matthew', chapter: 26, verse: 29, mark: 'rp2026-mat-26-29', modes: ['greek'] },
  { book: 'Philemon', chapter: 1, verse: 1, mark: 'rp2026-phm-1-1', modes: ['greek'] },
  { book: 'Revelation', chapter: 13, verse: 14, mark: 'rp2026-rev-13-14', modes: ['greek'] },
];

/** The version a unit's diagram is kept under: the grind's, marked when the unit ('Colossians 3:2', 'Colossians 3:1-2') holds a verse of REDRAWN that applies in this mode. */
function keptVersionOf(ref: string, lang: DiagramMode): string {
  const unit = /^(.+) (\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!unit) return DIAGRAM_VERSION;
  const [, book, chapter, first, last = first] = unit;
  const marks = REDRAWN.filter((r) => (r.modes ?? [lang]).includes(lang) && r.book === book && r.chapter === Number(chapter) && r.verse >= Number(first) && r.verse <= Number(last)).map((r) => r.mark);
  return [DIAGRAM_VERSION, ...marks].join('+');
}

/** The diagram kept for this place in this mode, or undefined when none is. */
export async function getDiagram(ref: string, lang: DiagramMode, version: string = keptVersionOf(ref, lang)): Promise<Diagram | undefined> {
  return (await db.diagrams.get([ref, lang, version]))?.diagram;
}

/** Keeps the diagram for this place in this mode, in place of any kept before. */
export async function keepDiagram(ref: string, lang: DiagramMode, diagram: Diagram, at: number = Date.now(), version: string = keptVersionOf(ref, lang)): Promise<void> {
  await db.diagrams.put({ ref, lang, version, diagram, at });
}
