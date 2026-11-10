// tests/support/repeat-guard.ts — the search of tests/unit/repeat-guard.test.ts (mw-t5shinh.8): which buttons of src/ step a value in their click handler, and which of them say what a quick second tap does.
// The app-wide guard (src/ui/tapGuard.ts) drops a second click on the same control within the settle moment; a button that steps a value (a page, a size, a count) is the one kind a thumb may
// tap twice on purpose, so each must choose: `data-repeat` (both taps count) or a line on the test's list saying why one tap a moment is right. Kept apart so a scratch file can be put through the same search.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A handler steps a value when it adds or takes a number from something: `n + 1`, `at - 1`, `+= 1`, `x++`, a literal step (`turn(1)`, `turn(-1)`; 0 is a reset) handed to a call, or a clamp. */
const STEPS = /\b\w+\s*[-+]\s*\d|(?:[-+]=|\+\+|--)(?!\w*>)|\(\s*[-+]?[1-9]\d*(?:\.\d+)?\s*\)|\bMath\.(?:min|max)\(/;
/** A handler named for stepping whose body is in another file or only declared here (`split.larger`, an interface method). */
const STEP_NAME = /^(?:larger|smaller|bigger|increase|decrease|increment|decrement|inc|dec|step\w*)$/i;
/** A button element: a lower-case `<button` or a component named …Button (HeaderButton). */
const OPEN = /<(button|[A-Z]\w*Button)\b/g;

export interface Stepping {
  /** repo-relative path */
  file: string;
  /** 1-indexed line of the opening tag */
  line: number;
  /** the onClick expression as written, trimmed to one line */
  handler: string;
  /** the tag carries data-repeat */
  repeats: boolean;
}

/** The end of the tag that opens at `start`: the first `>` outside braces and quotes. */
function tagEnd(source: string, start: number): number {
  let depth = 0;
  let quote = '';
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === quote && source[i - 1] !== '\\') quote = '';
    } else if (c === '"' || c === "'" || (c === '`' && depth > 0)) quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0 && source[i - 1] !== '=') return i;
  }
  return source.length;
}

/** The expression inside `onClick={ … }` of a tag's text, or null. */
function onClickOf(tag: string): string | null {
  const at = tag.indexOf('onClick={');
  if (at < 0) return null;
  let depth = 0;
  const from = at + 'onClick={'.length;
  for (let i = from; i < tag.length; i++) {
    if (tag[i] === '{') depth++;
    else if (tag[i] === '}') {
      if (depth === 0) return tag.slice(from, i).trim();
      depth--;
    }
  }
  return null;
}

/** The text of a named handler (`const larger = …`, `function larger(…)`, a property `larger(): void {` or `larger: () =>`) up to the next line that is not indented deeper than its first, for a file's own handlers. */
function bodyOf(source: string, name: string): string {
  const lines = source.split('\n');
  const declared = new RegExp(`^\\s*(?:export\\s+)?(?:const\\s+${name}\\b|function\\s+${name}\\b|(?:async\\s+)?${name}\\s*[:(=])`);
  const found = lines.findIndex((line) => declared.test(line) && !/^\s*(\/\/|\*)/.test(line));
  if (found < 0) return '';
  const indent = lines[found].search(/\S/);
  const body = [lines[found]];
  for (let i = found + 1; i < lines.length; i++) {
    if (lines[i].trim() !== '' && lines[i].search(/\S/) <= indent) {
      if (/^\s*[})\]]/.test(lines[i])) body.push(lines[i]);
      break;
    }
    body.push(lines[i]);
  }
  return body.join('\n');
}

/** The buttons of one source that step a value in their click handler. Comment lines are not code. */
export function steppingIn(source: string, file = 'scratch.tsx'): Stepping[] {
  const code = source
    .split('\n')
    .map((line) => (/^\s*(\/\/|\*|\/\*)/.test(line) ? '' : line))
    .join('\n');
  const found: Stepping[] = [];
  for (const match of code.matchAll(OPEN)) {
    const start = match.index ?? 0;
    const tag = code.slice(start, tagEnd(code, start));
    const handler = onClickOf(tag);
    if (handler === null) continue;
    // a bare name is a handler of the file's own: judge what it does; an inline arrow is judged as written
    const bare = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?$/.test(handler) ? handler.split('.').pop() ?? '' : '';
    const judged = bare ? bodyOf(code, bare) : handler;
    if (!STEPS.test(judged) && !STEP_NAME.test(bare)) continue;
    found.push({
      file,
      line: code.slice(0, start).split('\n').length,
      handler: handler.replace(/\s+/g, ' ').slice(0, 100),
      repeats: /\bdata-repeat\b/.test(tag),
    });
  }
  return found;
}

/** Every stepping button of every .tsx under `dir`. */
export function steppingButtons(dir: string, root: string = dir): Stepping[] {
  const found: Stepping[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...steppingButtons(path, root));
    else if (name.endsWith('.tsx')) found.push(...steppingIn(readFileSync(path, 'utf8'), path.slice(root.length + 1)));
  }
  return found;
}
