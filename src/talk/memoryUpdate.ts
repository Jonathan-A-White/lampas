// src/talk/memoryUpdate.ts — what a bible-talk answer does to the reader's memory (mw-yrmkdf.2, docs/ask-tutor.md 'Memory'). `memory_update` is a short
// list of {name | 'index', append | replace | remove, directed?}: an append goes on the end of the note (or the index) by 'tutor' and needs nothing more; a
// replace or a remove is applied ONLY when the entry says `directed: true`, which the grind's instructions allow only when he asked for exactly that in
// his words of this turn. The app does not see his words as meaning anything, so an undirected replace or remove is refused, logged and changes nothing.
// That rule, the four lines and the never-throws loop are voice-kit/talks' applyNoteUpdates (mw-o480n1.7); this file gives it Lampas's NoteStore.
// `wished_notes` are names of notes the tutor would have used had they existed: they are counted and the last names kept (Settings > About), nothing else.
import { applyNoteUpdates, type NoteStore, type NotesChange, type NoteUpdate } from 'voice-kit/talks';
import { appendToIndex, appendToNote, clearGreekNo, keepWishedNotes, memoryName, putNote, removeNote, setIndex } from '../data/repositories/memory';

/** One entry of `memory_update`: exactly one of append, replace or remove (the answer guard checks); `directed` only with the last two. The kit's NoteUpdate. */
export type MemoryUpdate = NoteUpdate;

/** The part of a bible-talk answer this reads. */
export interface MemoryAnswer {
  memory_update?: MemoryUpdate[];
  wished_notes?: string[];
  /** he asked for Greek himself (mw-yrmkdf.4): his earlier no to the Greek offer leaves the index */
  greek_asked?: true;
}

/** What was done (`applied`, one line each: 'Added to word:λόγος') and what was refused (`refused`, one line each, also logged). */
export type MemoryResult = NotesChange;

const INDEX = 'index';

/** Lampas's notes as the kit sees them: book:/word:/topic: names through memoryName, and 'index' for the index body. */
const notes: NoteStore = {
  nameOf: (raw) => (raw === INDEX ? INDEX : memoryName(raw)),
  append: (name, text, when) => (name === INDEX ? appendToIndex(text, 'tutor', when) : appendToNote(name, text, 'tutor', when)),
  replace: (name, text, when) => (name === INDEX ? setIndex(text, 'tutor', when) : putNote(name, text, 'tutor', when)),
  remove: async (name, when) => {
    if (name === INDEX) await setIndex('', 'tutor', when);
    else await removeNote(name);
    return 'saved';
  },
};

/** Applies the answer's memory_update and counts its wished_notes. It never throws: a note it cannot write is refused and logged. */
export async function applyMemoryFromAnswer(answer: MemoryAnswer, when: number = Date.now()): Promise<MemoryResult> {
  const result = await applyNoteUpdates(answer.memory_update ?? [], notes, { when, warn: (line) => console.warn(`Lampas memory: ${line}`) });
  if (answer.greek_asked) await clearGreekNo(when).catch(() => undefined);
  if (answer.wished_notes?.length) await keepWishedNotes(answer.wished_notes).catch(() => 0);
  return result;
}
