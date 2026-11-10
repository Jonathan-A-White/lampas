// tests/unit/lxx-copywork.test.ts — Copywork asks him to copy a Septuagint verse's words without Swete's stops (mw-u2w5klk.339, was .317): 'γῆν.' is 'γῆν'. A New Testament and a Hebrew verse give the words they gave.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { copyTextOf, copyWordsOf } from '../../src/practise/copywork';

const chapterOf = (path: string): Chapter => JSON.parse(readFileSync(path, 'utf8')) as Chapter;
const swete = chapterOf('tests/fixtures/data-lxx/gen/1.json');
const john = chapterOf('public/data/jhn/1.json');
const hebrew = chapterOf('public/data/gen/1.json');

describe('the words of a Septuagint verse to copy', () => {
  it('have no mark of Swete: γῆν. is γῆν', () => {
    expect(swete.verses[0].g.some((w) => w.t === 'γῆν.')).toBe(true);
    const words = copyWordsOf(copyTextOf(swete.verses[0], 'grc', swete));
    expect(words).toContain('γῆν');
    expect(words).not.toContain('γῆν.');
    expect(words.some((w) => /[.,;:·]$/u.test(w))).toBe(false);
    expect(words).toHaveLength(swete.verses[0].g.length);
  });

  it('also none in a verse with a comma and a high stop', () => {
    const words = copyWordsOf(copyTextOf(swete.verses[1], 'grc', swete));
    expect(words).toContain('ἀβύσσου');
    expect(words).toContain('ἀκατασκεύαστος');
    expect(words.join(' ')).not.toMatch(/[.,;·]/u);
  });
});

describe('the words of a New Testament and a Hebrew verse to copy', () => {
  it('are as before', () => {
    const verse = john.verses[0];
    expect(copyTextOf(verse, 'grc', john)).toBe(copyTextOf(verse, 'grc'));
    expect(copyWordsOf(copyTextOf(verse, 'grc', john))).toEqual(verse.g.map((w) => w.t.normalize('NFC')));
    const verse1 = hebrew.verses[0];
    expect(copyTextOf(verse1, 'hbo', hebrew)).toBe('בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ');
  });
});
