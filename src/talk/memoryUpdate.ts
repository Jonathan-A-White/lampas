// src/talk/memoryUpdate.ts — what a bible-talk answer does to the reader's memory (mw-yrmkdf.2, docs/ask-tutor.md 'Memory'). `memory_update` is a short
// list of {name | 'index', append | replace | remove, directed?}: an append goes on the end of the note (or the index) by 'tutor' and needs nothing more; a
// replace or a remove is applied ONLY when the entry says `directed: true`, which the grind's instructions allow only when he asked for exactly that in
// his words of this turn. The app does not see his words as meaning anything, so an undirected replace or remove is refused, logged and changes nothing.
// `wished_notes` are names of notes the tutor would have used had they existed: they are counted and the last names kept (Settings > About), nothing else.
import { appendToIndex, appendToNote, keepWishedNotes, memoryName, putNote, removeNote, setIndex } from '../data/repositories/memory';

/** One entry of `memory_update`: exactly one of append, replace or remove (the answer guard checks); `directed` only with the last two. */
export interface MemoryUpdate {
  name: string;
  append?: string;
  replace?: string;
  remove?: true;
  directed?: true;
}

/** The part of a bible-talk answer this reads. */
export interface MemoryAnswer {
  memory_update?: MemoryUpdate[];
  wished_notes?: string[];
}

export interface MemoryResult {
  /** what was done, one line each ('Added to word:λόγος') */
  applied: string[];
  /** what was refused, one line each, also logged */
  refused: string[];
}

const INDEX = 'index';

/** Applies the answer's memory_update and counts its wished_notes. It never throws: a note it cannot write is refused and logged. */
export async function applyMemoryFromAnswer(answer: MemoryAnswer, when: number = Date.now()): Promise<MemoryResult> {
  const result: MemoryResult = { applied: [], refused: [] };
  const refuse = (update: MemoryUpdate, why: string): void => {
    const line = `Did not change ${update.name}: ${why}`;
    result.refused.push(line);
    console.warn(`Lampas memory: ${line}`);
  };
  for (const update of answer.memory_update ?? []) {
    const isIndex = update.name === INDEX;
    const name = isIndex ? INDEX : memoryName(update.name);
    if (name === null) {
      refuse(update, 'not a name in the scheme');
      continue;
    }
    try {
      if (update.append !== undefined) {
        const saved = isIndex ? await appendToIndex(update.append, 'tutor', when) : await appendToNote(name, update.append, 'tutor', when);
        if (saved === 'saved') result.applied.push(`Added to ${name}`);
        else refuse(update, saved);
      } else if (update.directed !== true) {
        refuse(update, 'a replace or remove needs his words in this talk');
      } else if (update.replace !== undefined) {
        const saved = isIndex ? await setIndex(update.replace, 'tutor', when) : await putNote(name, update.replace, 'tutor', when);
        if (saved === 'saved') result.applied.push(`Replaced ${name}`);
        else refuse(update, saved);
      } else if (update.remove) {
        if (isIndex) await setIndex('', 'tutor', when);
        else await removeNote(name);
        result.applied.push(`Removed ${name}`);
      }
    } catch (error) {
      refuse(update, error instanceof Error ? error.message : 'could not be written');
    }
  }
  if (answer.wished_notes?.length) await keepWishedNotes(answer.wished_notes).catch(() => 0);
  return result;
}
