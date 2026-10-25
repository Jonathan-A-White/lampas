// src/data/repositories/diagrams.ts — the sentence diagrams the tutor drew, kept (mw-souyao.2): one row per verse or passage, mode and grind version, in the Dexie `diagrams` table. The ONLY file that
// reads or writes that table. A diagram is kept once it has passed validateDiagram (src/diagram/fetchDiagram.ts), so a row is always one that can be drawn; a second keep of the same place replaces the first.
import { db, type DiagramRow } from '../db';
import type { Diagram, DiagramMode } from '../../diagram/types';

export type { DiagramRow };

/** The sentence-diagram grind's version (grinds/sentence-diagram.json `versions`), which a kept diagram is keyed by: a later version of the grind draws and keeps its own. */
export const DIAGRAM_VERSION = '1';

/** The diagram kept for this place in this mode, or undefined when none is. */
export async function getDiagram(ref: string, lang: DiagramMode, version: string = DIAGRAM_VERSION): Promise<Diagram | undefined> {
  return (await db.diagrams.get([ref, lang, version]))?.diagram;
}

/** Keeps the diagram for this place in this mode, in place of any kept before. */
export async function keepDiagram(ref: string, lang: DiagramMode, diagram: Diagram, at: number = Date.now(), version: string = DIAGRAM_VERSION): Promise<void> {
  await db.diagrams.put({ ref, lang, version, diagram, at });
}
