// src/data/repositories/resources.ts — which study resources he switched on (src/resources/) and the name he typed for a resource's
// field, in the settings store: 'resource.<id>' is 'on', 'resourceOption.<id>' the text. All off, all empty to start with.
// The Logos lexicon ticks, the grammar books and the works are no longer kept here but on his shelf (library.ts): the same functions read and write the rows.
import { logos } from '../../resources/logos';
import { db } from '../db';
import { grammarBookTicks, lexiconPins, lexiconTicks, setGrammarBookTicks, setLexiconTicks, setWorkTicks, workTicks } from './library';

export interface StudyResources {
  /** ids of the resources switched on (in the store's key order) */
  on: string[];
  /** the text he typed for each resource that has a field and has one kept */
  options: Record<string, string>;
  /** the ids of the Logos lexicons he pinned (a subset of the ticked ones), in the library's order; none said means none pinned */
  pinnedLexicons?: string[];
}

const ON = 'resource.';
const OPTION = 'resourceOption.';

const LOGOS = 'logos';

export async function getStudyResources(): Promise<StudyResources> {
  const [rows, lexicons, pinnedLexicons] = await Promise.all([db.settings.toArray(), lexiconTicks(), lexiconPins()]);
  const on = rows.filter((r) => r.key.startsWith(ON) && r.value === 'on').map((r) => r.key.slice(ON.length));
  const options: Record<string, string> = {};
  for (const r of rows) if (r.key.startsWith(OPTION) && typeof r.value === 'string' && r.value !== '') options[r.key.slice(OPTION.length)] = r.value;
  // the lexicons ticked under Logos are the shelf's, as the JSON array of ids tickedOf reads; none is said while they are the ones that start ticked
  if (lexicons.join() !== logos.choices?.default.join()) options[LOGOS] = JSON.stringify(lexicons);
  return { on, options, pinnedLexicons };
}

export async function setResourceOn(id: string, on: boolean): Promise<void> {
  await db.settings.put({ key: ON + id, value: on ? 'on' : 'off' });
}

export async function setResourceOption(id: string, value: string): Promise<void> {
  if (id === LOGOS) {
    try {
      const ids: unknown = JSON.parse(value);
      if (Array.isArray(ids)) return await setLexiconTicks(ids.filter((i): i is string => typeof i === 'string'));
    } catch {
      // not a list of ids: nothing to tick
    }
    return;
  }
  await db.settings.put({ key: OPTION + id, value });
}

// The grammar books ticked under Logos (src/resources/grammarBooks.ts) are rows of his shelf (library.ts); the books that start ticked are the ones the shelf starts with.

/** The ids of the grammar books he ticked (on his shelf), in GRAMMAR_BOOKS' order. */
export const getGrammarBooks = grammarBookTicks;

export const setGrammarBooks = (ids: readonly string[]): Promise<void> => setGrammarBookTicks(ids);

// The works of his Logos library that he ticked under Study resources (src/resources/works.ts) are rows of his shelf too, one for each volume.

/** The ids of the works he ticked (on his shelf), in WORKS' order; none until he ticks one. */
export const getWorks = workTicks;

export const setWorks = (ids: readonly string[]): Promise<void> => setWorkTicks(ids);
