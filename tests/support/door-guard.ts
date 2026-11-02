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
  /** the components of the file that draw a layer and make no choice themselves (a layer's own component is what is mounted while it is up: a choice made by another component of the file is not made for it) */
  bare: string[];
  /** the places a Talk (<DialogAskTutor>, <LessonTalk>) is drawn only under a condition (`x ? <DialogAskTutor`, `x && <LessonTalk`), so in some states of the layer there is no target and the ? opens the tutor under it (mw-5r3p30.985) */
  conditional: string[];
}

/** A top-level declaration of a component: `function Name`, `export function Name`, `const Name =` at the start of a line. */
const COMPONENT = /^(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z]\w*)/;

/** The Talk drawn under a condition: the line, or the line before it when that one only opens the branch, holds `? <`, `&& <`, `? (` or `&& (` before the tag. */
const CONDITIONAL_TALK = /(?:\?|&&)\s*\(?\s*<(?:DialogAskTutor|LessonTalk)\b/;
const BRANCH_OPENS = /(?:\?|&&)\s*\(\s*$/;

/** Splits a source into its top-level components, each with the lines of its body. */
function componentsOf(lines: string[]): Array<{ name: string; body: string[] }> {
  const parts: Array<{ name: string; body: string[] }> = [];
  for (const line of lines) {
    const named = COMPONENT.exec(line);
    if (named || parts.length === 0) parts.push({ name: named?.[1] ?? '', body: [] });
    parts[parts.length - 1].body.push(line);
  }
  return parts;
}

/** What a source gives the guard besides its layer: the components that draw one and choose nothing, and the Talks drawn under a condition. */
export function inspect(source: string): { bare: string[]; conditional: string[] } {
  const lines = source.split('\n');
  const bare = componentsOf(lines)
    .filter((part) => part.name !== '' && LAYER.test(part.body.join('\n')) && !CHOICE.test(part.body.join('\n')))
    .map((part) => part.name);
  const conditional: string[] = [];
  lines.forEach((line, i) => {
    const opens = /<(?:DialogAskTutor|LessonTalk)\b/.test(line) && ((i > 0 && BRANCH_OPENS.test(lines[i - 1]) && /^\s*<(?:DialogAskTutor|LessonTalk)\b/.test(line)) || CONDITIONAL_TALK.test(line));
    if (opens) conditional.push(line.trim().slice(0, 80));
  });
  return { bare, conditional };
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
      if (LAYER.test(source)) found.push({ file: path.slice(root.length + 1), z: zOf(source), chooses: CHOICE.test(source), ...inspect(source) });
    }
  }
  return found;
}
