// Review's See the table (mw-irpgqi.6): the ending card opens the table on the asked word's own forms (This word), with the cell it asked lit, not the bare pattern.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { ideaOf } from '../../src/data/grammar/ladder';
import { buildEnding, type GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { seeTableAddress } from '../../src/review/seeTable';

const jn1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;

describe('the ending question carries its word', () => {
  it('names the form as the text has it, its lemma and its parsing', () => {
    const asked = Array.from({ length: 40 }, (_, i) => buildEnding(ideaOf('case-genitive'), [jn1], mulberry32(i + 1))).filter((q): q is GrammarQuestion => q !== null);
    expect(asked.length).toBeGreaterThan(5);
    for (const q of asked) {
      expect(q.word, q.prompt).toBeTruthy();
      expect(q.lemma, q.prompt).toBeTruthy();
      expect(q.prompt.endsWith(` of ${q.lemma}`)).toBe(true);
      expect(q.word!.normalize('NFC').startsWith(q.form!.slice(0, -1).normalize('NFC')), q.prompt).toBe(true);
    }
  });
});

describe('seeTableAddress', () => {
  const ending = (over: Partial<GrammarQuestion>): GrammarQuestion => ({
    kind: 'ending',
    ideaId: 'number-plural',
    prompt: 'Fill in the ending: accusative plural of ἁμαρτία',
    options: ['ας', 'αι', 'ων', 'αις'],
    right: 'ας',
    form: 'ἁμαρτί_',
    code: 'N-APF',
    table: 'noun-endings',
    word: 'ἁμαρτίας',
    lemma: 'ἁμαρτία',
    ...over,
  });

  it('opens the question’s table in Learn on the asked word, in This word, with the asked cell named', () => {
    const address = seeTableAddress(ending({}));
    expect(address).toMatchObject({ table: 'noun-endings', mode: 'learn', word: 'ἁμαρτίας', parse: 'N-APF', lemma: 'ἁμαρτία', own: true });
    expect(address?.cell).toMatch(/accusative/i);
    expect(address?.cell).toMatch(/plural/i);
  });

  it('opens the bare table when the question names no word (an older card)', () => {
    expect(seeTableAddress(ending({ word: undefined, lemma: undefined }))).toEqual({ table: 'noun-endings' });
  });

  it('is nothing for a question with no table or one that is not an ending', () => {
    expect(seeTableAddress(ending({ table: undefined }))).toBeUndefined();
    expect(seeTableAddress(ending({ kind: 'tap-form' }))).toBeUndefined();
  });
});
