// tests/unit/lxx-grammar-gaps.test.ts — npm run lxx:grammar-gaps (scripts/lxx/grammar-gaps.ts, mw-u2w5klk.277): every parsing code of the shipped Septuagint run through the
// paradigm tables (tableFor) and the grammar ideas, the gaps written to docs/lxx-grammar-gaps.md. A fixture of ten codes, among them the optative V-AAO-1S and
// the vocative of the article T-VSM, which the New Testament has hardly any of and the tables hold no cell for.
import { describe, expect, it } from 'vitest';
import { codeGaps, collectCodes, gapsMarkdown, ideaNeeds, lexiconGaps, type ShippedChapter } from '../../scripts/lxx/grammar-gaps';

const word = (t: string, l: string, p: string) => ({ t, l, p });

/** Ten codes in two verses of a made-up chapter of Genesis (Swete's book code, the Greek chapter number). */
const CHAPTER: ShippedChapter = {
  code: 'gen',
  chapter: 1,
  verses: [
    { n: 1, g: [word('λύσαιμι', 'λύω', 'V-AAO-1S'), word('ὦ', 'ὁ', 'T-VSM'), word('ἔλυσεν', 'λύω', 'V-AAI-3S'), word('λόγος', 'λόγος', 'N-NSM'), word('ἀγαθός', 'ἀγαθός', 'A-NSM')] },
    { n: 2, g: [word('λύων', 'λύω', 'V-PAP-NSM'), word('ἐν', 'ἐν', 'PREP'), word('καί', 'καί', 'CONJ'), word('λαβών', 'λαμβάνω', 'V-2AAP-NSM'), word('ὁ', 'ὁ', 'T-NSM'), word('ἔλυσαν', 'λύω', 'V-AAI-3S')] },
  ],
};
const NEW_TESTAMENT = new Set(['V-AAI-3S', 'N-NSM', 'A-NSM', 'V-PAP-NSM', 'PREP', 'CONJ', 'V-2AAP-NSM', 'T-NSM', 'V-AAO-1S']);

describe('the Septuagint grammar check', () => {
  const figures = collectCodes([CHAPTER]);

  it('counts each code with its first word and verse as the example', () => {
    expect(figures.size).toBe(10);
    expect(figures.get('V-AAI-3S')).toMatchObject({ count: 2, example: { t: 'ἔλυσεν', l: 'λύω', ref: 'Gen 1:1' } });
    expect(figures.get('T-VSM')).toMatchObject({ count: 1, example: { t: 'ὦ', ref: 'Gen 1:1' } });
  });

  const gaps = codeGaps(figures, NEW_TESTAMENT);
  const of = (code: string) => gaps.find((g) => g.code === code);

  it('finds the optative has a table but no cell for it', () => {
    expect(of('V-AAO-1S')).toMatchObject({ kind: 'no-cell', table: 'future-and-aorist', missing: ['mood-optative'], mood: 'optative', pos: 'verb', septuagintOnly: false });
  });

  it('finds the vocative of the article has a table but no cell for it', () => {
    expect(of('T-VSM')).toMatchObject({ kind: 'no-cell', table: 'article', missing: ['case-vocative'], septuagintOnly: true });
  });

  it('finds a code with no table at all, and names the indeclinables', () => {
    expect(of('PREP')).toMatchObject({ kind: 'no-table', indeclinable: true });
    expect(of('CONJ')).toMatchObject({ kind: 'no-table', indeclinable: true });
  });

  it('leaves the codes a table holds out of the gaps', () => {
    for (const code of ['V-AAI-3S', 'N-NSM', 'A-NSM', 'V-PAP-NSM', 'T-NSM']) expect(of(code)).toBeUndefined();
  });

  it('finds the lemmas with no lexicon entry, or a blank one', () => {
    const lexicon = { λύω: { g: 'loose', d: 'λύω', s: 'G3089' }, ὁ: { g: '', d: '', s: '' }, ἀγαθός: { g: 'good', d: 'x', s: 'G18' }, λόγος: { g: 'word', d: 'x', s: 'G3056' } };
    const found = lexiconGaps(figures, lexicon);
    expect(found.missing.map((m) => m.lemma)).toEqual(['ἐν', 'καί', 'λαμβάνω']);
    expect(found.blank.map((m) => m.lemma)).toEqual(['ὁ']);
    expect(found.missing[0]).toMatchObject({ example: { t: 'ἐν', ref: 'Gen 1:2' } });
  });

  it('finds the ideas the forms need that no table or reading lesson teaches', () => {
    const ideas = ideaNeeds(figures, NEW_TESTAMENT);
    const optative = ideas.find((i) => i.id === 'mood-optative');
    expect(optative).toMatchObject({ tables: 0, readInLesson: false, words: 1 });
    expect(ideas.find((i) => i.id === 'case-vocative')).toMatchObject({ readInLesson: false });
  });

  it('writes the markdown: the codes grouped by mood and part of speech, the lemmas, the ideas', () => {
    const text = gapsMarkdown({ figures, codes: gaps, lexicon: lexiconGaps(figures, {}), ideas: ideaNeeds(figures, NEW_TESTAMENT), source: 'dist/data-lxx' });
    expect(text).toContain('# Septuagint grammar gaps');
    expect(text).toContain('V-AAO-1S');
    expect(text).toContain('mood-optative');
    expect(text).toMatch(/optative/i);
    expect(text).toContain('T-VSM');
    expect(text).toContain('ὦ (ὁ) Gen 1:1');
    expect(text).toContain('Lemmas with no lexicon entry');
    expect(text).toContain('Ideas the Septuagint needs');
    // a second run on the same inputs writes the same bytes
    expect(gapsMarkdown({ figures, codes: gaps, lexicon: lexiconGaps(figures, {}), ideas: ideaNeeds(figures, NEW_TESTAMENT), source: 'dist/data-lxx' })).toBe(text);
  });
});
