// The committed choices files of the known-answer chapters (data/lxx/known/, story mw-u2w5klk.7, M0): the record of a model session that chose
// John 1's and Romans 8's pending words with the books hidden. The scoring itself needs the pinned sources (data/raw, not in git), so the gate
// checks what it can without them: each file reads, holds only its own chapter's references, and keeps to the bar's guess limit.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALWAYS_CHAPTER, BAR, SECOND_CHAPTERS, secondChapter } from '../../scripts/lxx/bar';
import { readChoices } from '../../scripts/lxx/choices';
import { knownFileOf, KNOWN_DIR } from '../../scripts/lxx/known';
import { knownChaptersOf } from '../../scripts/lxx/release';

/**
 * The chapter's words in TAGNT's NA28 rows (829 and 652): the share the guess limit is counted over. The pending counts include the 5 and 7 words the rule of
 * mw-u2w5klk.28 leaves pending (a lone candidate on thin support), and one more each that mw-u2w5klk.30 does (analogy's: Jhn.1:32#6, Rom.8:26#13), chosen by a blind
 * reader and marked so in each file.
 */
const CHAPTERS = [
  { chapter: 'Jhn.1', words: 829, pending: 155 },
  { chapter: 'Rom.8', words: 652, pending: 143 },
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

describe('the chapters a build is held to, with the files data/lxx/known holds (mw-u2w5klk.265)', () => {
  it('holds every build to John 1 and to a second chapter that has a file: Romans 8 for the ten builds whose own chapter has none, and a build whose own chapter has one to it', () => {
    for (let build = 0; build < 2 * SECOND_CHAPTERS.length; build++) {
      const { chapters, note } = knownChaptersOf(build, KNOWN_DIR);
      expect(chapters).toEqual([ALWAYS_CHAPTER, 'Rom.8']);
      // each chapter held has its file, and a build that rotates to a chapter with no file says which was used
      for (const c of chapters) expect(CHAPTERS.some((k) => k.chapter === c)).toBe(true);
      if (secondChapter(build) === 'Rom.8') expect(note).toBeUndefined();
      else expect(note).toBe(`second chapter ${secondChapter(build)}: no choices file; Rom.8 used`);
    }
  });
});
