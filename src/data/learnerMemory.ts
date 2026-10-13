// src/data/learnerMemory.ts — what every tutor grist is told of what Lampas remembers about the reader (mw-yrmkdf.2): the request's `memory`, made from the
// memory kept on the phone (repositories/memory.ts, Settings > Memory). It is the index as the tutor reads it plus the notes the app chose BY NAME for the
// place, the word and the screen of the ask (selectNotes); the tutor is not asked which notes it wants, and one it wished it had is only counted
// (`wished_notes`, src/talk/memoryUpdate.ts). Missing when nothing is kept. It is bounded by the schemas: the index at most MEMORY_INDEX_MAX characters, a note at
// most MEMORY_NOTE_MAX, at most one book note, one word note and one screen note.
import { selectNotes, type MemorySelection } from './repositories/memory';

/** The `memory` field of a request (grinds/*.input.schema.json). */
export interface MemoryField {
  index: string;
  notes: { name: string; text: string }[];
}

/** The field for a selection, or undefined when there is neither an index nor a note. */
export function memoryFieldOf(selection: MemorySelection): MemoryField | undefined {
  if (selection.index === '' && selection.notes.length === 0) return undefined;
  return { index: selection.index, notes: selection.notes.map((n) => ({ name: n.name, text: n.text })) };
}

/** The field for the memory kept now: the index and the notes named for `reference` ('Romans 8:28'), the word `focusLemma` and the `screen` (its name). */
export async function learnerMemory(reference?: string, focusLemma?: string, screen?: string): Promise<MemoryField | undefined> {
  return memoryFieldOf(await selectNotes(reference, focusLemma, screen));
}

/** The dictionary form of the word a question is about, when it is about one: a word's, or a Quick test question's. */
export function focusLemmaOf(focus: object | undefined): string | undefined {
  return focus && 'lemma' in focus && typeof focus.lemma === 'string' && focus.lemma !== '' ? focus.lemma : undefined;
}
