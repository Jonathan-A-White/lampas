// src/talk/doneLines.ts — what the tutor client made of an answer's `do` (mw-t3xu9a.7), as the lines a turn keeps: one per command, in the order the answer named them, each the app's own words for what it did.
// A command that ran has its said line (and its undo, held only while the page lives, src/talk/doneUndo.ts); a command of kind confirm did not run and has the question put to him, with its args kept for the
// button; a command the registry refused, or whose run failed, is a sentence in `refused` (the client has recorded it as a miss), so the talk never claims something that did not happen.
import type { Registry, Taken } from 'voice-kit/talks';
import type { TurnDone } from '../data/db';
import type { DoCall } from '../services/talk';

export interface DoneLines {
  /** one per command that ran or waits for his yes, in the answer's order */
  lines: TurnDone[];
  /** the undo of each line, at the same place; missing for a line with none */
  undos: (() => Promise<void>)[];
  /** a sentence for each command that was refused or failed */
  refused: string[];
}

/** A command's name as its button reads: 'forget-note' is 'Forget note'. */
export const buttonName = (name: string): string => {
  const words = name.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function doneLinesOf(calls: readonly DoCall[], taken: Taken, registry: Registry): DoneLines {
  const lines: TurnDone[] = [];
  const undos: DoneLines['undos'] = [];
  const refused: string[] = [];
  const misses = [...taken.misses];
  let ran = 0;
  let waiting = 0;
  for (const call of calls) {
    const command = registry.command(call.name);
    if (command?.kind === 'confirm' && !registry.refuses(call.name, call.args)) {
      const pending = taken.pending[waiting++];
      if (pending) lines.push({ name: call.name, kind: 'confirm', said: pending.said, args: call.args ?? {} });
    } else if (command && taken.done[ran]?.name === call.name) {
      const done = taken.done[ran++];
      if (done.undo) undos[lines.length] = done.undo;
      lines.push({ name: done.name, kind: done.kind, said: done.said });
    } else {
      const miss = misses.findIndex((m) => m.name === call.name || m.name === '');
      const why = miss >= 0 ? misses.splice(miss, 1)[0].why : undefined;
      refused.push(`Could not ${buttonName(call.name).toLowerCase()}${why ? `: ${why}` : ''}`);
    }
  }
  return { lines, undos, refused };
}
