// The committed choices files of the known-answer chapters (data/lxx/known/, story mw-u2w5klk.7, M0): the record of a model session that chose
// John 1's and Romans 8's pending words with the books hidden. The scoring itself needs the pinned sources (data/raw, not in git), so the gate
// checks what it can without them: each file reads, holds only its own chapter's references, and keeps to the bar's guess limit.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BAR } from '../../scripts/lxx/bar';
import { readChoices } from '../../scripts/lxx/choices';
import { knownFileOf, KNOWN_DIR } from '../../scripts/lxx/known';

/** The chapter's words in TAGNT's NA28 rows (829 and 652): the share the guess limit is counted over. */
const CHAPTERS = [
  { chapter: 'Jhn.1', words: 829, pending: 149 },
  { chapter: 'Rom.8', words: 652, pending: 135 },
];

describe.each(CHAPTERS)('the known-answer choices of $chapter', ({ chapter, words, pending }) => {
  const file = `${KNOWN_DIR}/${knownFileOf(chapter)}`;
  const choices = readChoices(readFileSync(file, 'utf8'), file);

  it('has a choice for each of the chapter’s pending words, all of this chapter', () => {
    expect(choices.size).toBe(pending);
    for (const ref of choices.keys()) expect(ref.startsWith(`${chapter}:`)).toBe(true);
  });

  it('names a lemma for every guess, and keeps the guesses within the bar', () => {
    const guesses = [...choices.values()].filter((c) => c.mark === 'guess');
    for (const g of guesses) expect(g.lemma, g.ref).not.toBe('');
    expect(100 * guesses.length).toBeLessThanOrEqual(BAR.guesses * words);
  });
});
