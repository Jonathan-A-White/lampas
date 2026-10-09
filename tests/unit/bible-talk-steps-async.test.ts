// mw-5r3p30.114: the flake in features/steps/bible-talk.steps.tsx. A turn, an answer line or a spoken utterance arrives a
// moment after the step before it ended; an `expect` that reads it outside a waitFor passes on a quiet machine and fails
// on a busy one. This reads the steps file and refuses a positive read of such a value that is not inside a waitFor.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILE = 'features/steps/bible-talk.steps.tsx';
// What arrives asynchronously: the live list of turns and the text of an answer, the change rows, what the engine was asked to say.
const ARRIVES = /\b(?:turns\(\)|lines\(\)|answerBox\(\)|changeRows\(\)|engine\.spoken|said|turn\b)/;
// Reading that something is absent (or empty) is settled once the thing it is absent from has appeared.
const ABSENCE = /toHaveLength\(0\)|toBeNull\(\)|\.not\./;

const indentOf = (line: string): number => line.length - line.trimStart().length;

/** True when a line above `index`, in a block that encloses it, calls waitFor( or one of this file's helpers that does. */
function insideWaitFor(lines: string[], index: number): boolean {
  if (/\bwaitFor\(/.test(lines[index])) return true;
  let indent = indentOf(lines[index]);
  for (let i = index - 1; i >= 0 && indent > 0; i--) {
    if (lines[i].trim() === '' || indentOf(lines[i]) >= indent) continue;
    indent = indentOf(lines[i]);
    if (/\bwaitFor\(/.test(lines[i])) return true;
    if (/^\s*(And|Then|When|Given|Scenario)\(|^(async )?function |^const \w+ = /.test(lines[i])) return false;
  }
  return false;
}

describe(`${FILE} reads nothing that arrives later outside a waitFor`, () => {
  const lines = readFileSync(FILE, 'utf8').split('\n');
  it('has no positive expect on a turn, a line, the answer, a change row or a spoken utterance outside a waitFor', () => {
    const racy = lines
      .map((text, i) => ({ text, i }))
      .filter(({ text }) => /\bexpect\(/.test(text) && ARRIVES.test(text) && !ABSENCE.test(text))
      .filter(({ i }) => !insideWaitFor(lines, i))
      .map(({ text, i }) => `${FILE}:${i + 1}: ${text.trim()}`);
    expect(racy, `these steps read a value outside a waitFor:\n${racy.join('\n')}`).toEqual([]);
  });
});
