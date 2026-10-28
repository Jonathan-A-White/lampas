// scripts/variants-english.ts (npm run variants:english, mw-9ji6ek0.3): what the model is asked and how its English is checked, with the model faked; never the network.
import { describe, expect, it } from 'vitest';
import { fileText, formIndexOf, itemOf, parseAnswer, problemsWith, render, type Item } from '../../scripts/variants-english';
import type { Chapter } from '../../src/data/chapter';

const chapter: Chapter = {
  book: 'Revelation',
  code: 'rev',
  chapter: 3,
  lex: { G1: { g: 'beast', d: 'a wild animal, beast' }, G2: { g: 'to go up', d: 'ascend, go up' }, G3: { g: 'the', d: 'the article' } },
  parse: {},
  verses: [
    {
      n: 8,
      g: [
        { t: 'Τὸ', tr: 'to', s: 'G3', l: 'ὁ', p: 'T-NSN', e: 0 },
        { t: 'θηρίον', tr: 'therion', s: 'G1', l: 'θηρίον', p: 'N-NSN', e: 0 },
        { t: 'ἀναβαίνειν', tr: 'anabainein', s: 'G2', l: 'ἀναβαίνω', p: 'V-PAN', e: 1 },
      ],
      e: [{ t: 'The beast', g: [0, 1] }, { t: 'to go up', g: [2] }],
    },
  ],
};
const index = formIndexOf([chapter]);
const missing = {
  key: 'rev 3:8 w1-1 abcd',
  ref: 'Revelation 3:8',
  code: 'rev',
  chapter: 3,
  unit: { v: 8, w: [1], base: 'θηρίον', alts: [{ code: 'N' as const, text: 'θηρίου' }, { code: 'B' as const, text: '' }] },
};
const item: Item = itemOf(0, missing, chapter, index);

describe('what the model is shown', () => {
  it('is the verse in Greek and English, the base and each reading with the lemma and gloss of its words', () => {
    expect(item.verse_greek).toBe('Τὸ θηρίον ἀναβαίνειν');
    expect(item.verse_english).toBe('The beast to go up');
    expect(item.base).toEqual({ greek: 'θηρίον', lemmas: [{ word: 'θηρίον', lemma: 'θηρίον', gloss: 'beast' }] });
    expect(item.readings.map((r) => r.witness)).toEqual(['Nestle-Aland', 'another Byzantine reading']);
    expect(item.readings[0].lemmas).toEqual([]); // θηρίου is not a form the text has
  });
});

describe('checking the English against the Greek lemmas', () => {
  it('passes English that matches a lemma’s gloss, with nothing for a reading that leaves the base out', () => {
    expect(problemsWith(item, { base: 'the beasts', alts: ['of a beast', ''] }, index)).toEqual([]);
  });

  it('lets a form of the lemma pass, an inflected one and the forms of "to be" that share no letters with it', () => {
    const be = { ...item, base: { greek: 'ἐστίν', lemmas: [] }, readings: [] };
    const idx = new Map([['εστιν', [{ lemma: 'εἰμί', pos: 'V', gloss: 'to be', definition: 'to exist' }]], ['ποιουντες', [{ lemma: 'ποιέω', pos: 'V', gloss: 'to do, make', definition: '' }]]]);
    expect(problemsWith(be, { base: 'is', alts: [] }, idx)).toEqual([]);
    expect(problemsWith({ ...be, base: { greek: 'ποιοῦντες', lemmas: [] } }, { base: 'doing', alts: [] }, idx)).toEqual([]);
    expect(problemsWith(be, { base: 'the king', alts: [] }, idx)).toHaveLength(1);
  });

  it('refuses a base that is not 1 to 6 words, a reading with words where the Greek has none, and Greek letters or brackets', () => {
    expect(problemsWith(item, { base: 'one two three four five six seven', alts: ['beast', ''] }, index)[0]).toMatch(/base.*7 words/);
    expect(problemsWith(item, { base: 'beast', alts: ['beast', 'beast'] }, index)[0]).toMatch(/reading 2.*give nothing/);
    expect(problemsWith(item, { base: 'beast (θηρίον)', alts: ['beast', ''] }, index)[0]).toMatch(/Greek letters or brackets/);
  });

  it('refuses a noun, verb or adjective whose English shares nothing with the gloss of its lemma', () => {
    expect(problemsWith(item, { base: 'the dragon', alts: ['beast', ''] }, index)).toEqual([expect.stringMatching(/base.*"the dragon".*θηρίον \(beast\)/)]);
  });

  it('refuses an answer of the wrong shape', () => {
    expect(problemsWith(item, undefined, index)).toHaveLength(1);
    expect(problemsWith(item, { base: 'beast', alts: ['beast'] }, index)).toHaveLength(1);
  });
});

describe('asking', () => {
  it('reads the JSON array out of the model’s text', () => {
    expect(parseAnswer('Here you go:\n[{"id":0,"base":"a","alts":["b"]}]')).toEqual([{ id: 0, base: 'a', alts: ['b'] }]);
    expect(() => parseAnswer('no json')).toThrow();
  });

  it('asks again, saying what was wrong, for an item whose answer failed the check, and keeps the corrected English', async () => {
    const prompts: string[] = [];
    const replies = ['[{"id":0,"base":"the dragon","alts":["beast",""]}]', '[{"id":0,"base":"the beast","alts":["beast",""]}]'];
    const { made, flagged } = await render([item], index, 'sonnet', undefined, async (_model, prompt) => {
      prompts.push(prompt);
      return replies[prompts.length - 1];
    });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain('does not match');
    expect(made.get(0)).toEqual({ source: 'lampas', base: 'the beast', alts: ['beast', ''] });
    expect(flagged.size).toBe(0);
  });

  it('keeps English that still fails after the retries and reports it', async () => {
    const { made, flagged } = await render([item], index, 'sonnet', undefined, async () => '[{"id":0,"base":"the dragon","alts":["beast",""]}]');
    expect(made.get(0)?.base).toBe('the dragon');
    expect(flagged.get(0)).toHaveLength(1);
  });
});

describe('the file', () => {
  it('is written with its keys in order and one entry to a line, so a second run changes nothing', () => {
    const text = fileText({ 'b 1:1 w0-0 22': { source: 'lampas', base: 'x', alts: ['y'] }, 'a 1:1 w0-0 11': { source: 'lampas', base: 'p', alts: ['q'] } });
    expect(text).toBe('{\n "a 1:1 w0-0 11": {"source":"lampas","base":"p","alts":["q"]},\n "b 1:1 w0-0 22": {"source":"lampas","base":"x","alts":["y"]}\n}\n');
    expect(JSON.parse(text)).toHaveProperty(['a 1:1 w0-0 11', 'base'], 'p');
  });
});
