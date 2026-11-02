// tests/support/door-guard.ts — the search of tests/unit/door-guard.test.ts (mw-5r3p30.955): which files of src/ draw a fixed full-screen layer, and which of them chose what the floating ? does over it.
// A layer is a class string with `fixed` and `inset-0`; a choice is one of the hooks of src/tutor/door.ts or the dialog that wraps one. Kept apart so a scratch file can be put through the same search.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A `fixed` and an `inset-0` on one line with no quote between them: one class string. */
const LAYER = /\bfixed\b[^\n"'`]*\binset-0\b|\binset-0\b[^\n"'`]*\bfixed\b/;
/** What a file does to choose: no ? over the layer (useNoDoor), a target of its own (useDoorTarget, registerDoorTarget), or a Talk drawn inside the layer (DialogAskTutor, LessonTalk). */
const CHOICE = /\b(useNoDoor|useDoorTarget|registerDoorTarget|DialogAskTutor|LessonTalk)\(|<(DialogAskTutor|LessonTalk)\b/;

/** The z-index a layer is drawn at, from the first line that makes it ('z-40'), for the report. */
const zOf = (source: string): string => source.split('\n').find((line) => LAYER.test(line))?.match(/\bz-(\[?[0-9]+\]?)/)?.[0] ?? 'z-auto';

export interface Found {
  /** repo-relative path */
  file: string;
  z: string;
  /** the file makes a choice */
  chooses: boolean;
}

/** Every .tsx file under `dir` that draws a fixed full-screen layer. */
export function layersIn(dir: string, root: string = dir): Found[] {
  const found: Found[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...layersIn(path, root));
    else if (name.endsWith('.tsx')) {
      // comment lines are not code: a file that only talks of `fixed inset-0` or of useNoDoor() neither draws a layer nor chooses
      const source = readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');
      if (LAYER.test(source)) found.push({ file: path.slice(root.length + 1), z: zOf(source), chooses: CHOICE.test(source) });
    }
  }
  return found;
}
