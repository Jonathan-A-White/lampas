// tests/unit/lxx-comma-lemma.test.ts — a Septuagint lemma the derivation writes as a list ('ὕδωρ, ὕδατος') is the same word as its headword ('ὕδωρ') for every consumer keyed by a lemma string
// (mw-u2w5klk.327; own-forms.test.ts holds the lemma-forms files, mw-u2w5klk.297): the Septuagint lexicon, a link or a tutor's word, the weave, the new-word picker, the Quick test's places,
// an answer's word found again in the text, and the grammar that reads a lemma. Each is asked by the list and by the headword and must give one answer.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { findGreekWord } from '../../src/data/answerWord';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { pickFrontier, type Known } from '../../src/data/frontier';
import type { FrequencyEntry } from '../../src/data/frequency';
import { passageWords } from '../../src/data/grammar/drillItems';
import { stemOf } from '../../src/data/grammar/questions';
import { ownIdeaOfWord } from '../../src/data/grammar/ladder';
import { patternsOf } from '../../src/data/grammar/patterns';
import { textIdeasOf } from '../../src/data/grammar/textIdeas';
import { lookupSeptuagintLemma, septuagintLemmas, type LemmaLexicon } from '../../src/data/lexicon';
import { isFormOf } from '../../src/data/quiz';
import { numeralValue } from '../../src/data/numerals';
import { weaveForTeaching, weaveWord } from '../../src/data/weave';
import { findWord } from '../../src/nav/links';
import { septuagintSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import type { TalkScope } from '../../src/services/talk';
import { stubChapterFetch } from '../support/chapter-fetch';

/** The four comma lemmas of the Genesis fixture (tests/fixtures/data-lxx/gen/1.json): the list, its headword, and a parsing a word of it has. */
const LEMMAS: ReadonlyArray<{ list: string; head: string; code: string; form: string }> = [
  { list: 'ὕδωρ, ὕδατος', head: 'ὕδωρ', code: 'N-NSN', form: 'ὕδωρ' },
  { list: 'ὅς, ἥ', head: 'ὅς', code: 'R-NSM', form: 'ὅς' },
  { list: 'οὕτω, οὕτως', head: 'οὕτω', code: 'ADV', form: 'οὕτως' },
  { list: 'ἄρρην, ἄρσην', head: 'ἄρρην', code: 'A-NSM', form: 'ἄρσην' },
];

const word = (l: string, code: string, form: string): GreekWord => ({ t: form, tr: '', s: '', l, p: code, y: '1' });
const chapterOf = (...words: GreekWord[]): Chapter => ({
  book: 'Genesis',
  code: 'gen',
  chapter: 1,
  edition: 'swete',
  lex: {},
  parse: {},
  verses: [{ n: 1, g: words, e: words.map((w, i) => ({ t: w.t, g: [i] })) }],
});

const fixtureLexicon = JSON.parse(readFileSync('tests/fixtures/data-lxx/lexicon-grc-lxx.json', 'utf8')) as Record<string, { g: string; s?: string }>;
const lexicon: LemmaLexicon = Object.fromEntries(Object.entries(fixtureLexicon).map(([lemma, { g, s }]) => [lemma, { g, s: s ?? '', c: '' }]));

describe.each(LEMMAS)('the Septuagint lemma $list and its headword $head', ({ list, head, code, form }) => {
  beforeEach(async () => {
    stubChapterFetch();
    await setSetting(septuagintSetting, 'on');
  });

  it('is one entry of the Septuagint lexicon, found by either', async () => {
    const byList = await lookupSeptuagintLemma(list);
    expect(byList, list).toBeDefined();
    expect(await lookupSeptuagintLemma(head)).toEqual(byList);
    expect(Object.keys(await septuagintLemmas())).toContain(list);
  });

  it('is one word to a link or a tutor that names it, with the New Testament lexicon lacking it', () => {
    const byList = findWord(list, {}, undefined, lexicon);
    expect(byList?.lemma).toBe(list);
    expect(findWord(head, {}, undefined, lexicon)).toEqual(byList);
  });

  it('is one word to the weave: his headword weaves the list', () => {
    const w = word(list, code, form);
    expect(weaveWord(w, { solid: new Set([head]) })).toBe('solid');
    expect(weaveWord(w, { solid: new Set(), learning: new Set([head]) })).toBe('learning');
    expect(weaveWord(w, { solid: new Set() })).toBeNull();
    const woven = weaveForTeaching(chapterOf(w).verses[0], new Set(), head);
    expect(woven.some((chunk) => chunk?.learning), 'the teach sheet marks the headword in the verse').toBe(true);
  });

  it('is one word to the new-word picker: known by its headword it is not offered, else offered as the headword with its count', () => {
    const chapter = chapterOf(word(list, code, form));
    const frequency: FrequencyEntry[] = [{ strongs: 'G1', lemma: head, count: 321, chapters: 9, proper: false }];
    const none: Known = { solid: new Set(), learning: new Set(), dropped: new Set() };
    for (const state of ['solid', 'learning', 'dropped'] as const) {
      expect(pickFrontier(chapter, { ...none, [state]: new Set([head]) }, frequency, 10), state).toEqual([]);
    }
    const offered = pickFrontier(chapter, none, frequency, 10);
    expect(offered.map((c) => c.lemma)).toEqual([head]);
    expect(offered[0].count).toBe(321);
  });

  it("is one word to the Quick test: a place of the headword's word is the list's too", () => {
    expect(isFormOf(word(list, code, form), new Set([head]))).toBe(true);
  });

  it('is found in the text by the headword an answer names', () => {
    const w = word(list, code, form);
    const chapter = chapterOf(w);
    const scope = { title: 'Genesis 1', chapter, verse: null } as TalkScope;
    expect(findGreekWord(scope, { greek: 'ἄλλο', lemma: head, note: '' })).toBe(w);
  });
});

/** Lists whose headword the grammar's tables name literally (a preposition of the twelve, εἰμί, a numeral), with a parsing and a form of the word. */
const GRAMMAR: ReadonlyArray<{ list: string; head: string; code: string; form: string }> = [
  ...LEMMAS,
  { list: 'ἐκ, ἐξ', head: 'ἐκ', code: 'PREP', form: 'ἐξ' },
  { list: 'εἰμί, εἶναι', head: 'εἰμί', code: 'V-PAI-3S', form: 'ἐστίν' },
  { list: 'δύο, δυοῖν', head: 'δύο', code: 'A-NPM-NUM', form: 'δύο' },
];

describe.each(GRAMMAR)('the grammar that reads the lemma $list as it reads $head', ({ list, head, code, form }) => {
  it('finds the same pattern ideas, text ideas, own idea, stem and numeral value', () => {
    expect(patternsOf({ l: list, p: code, t: form })).toEqual(patternsOf({ l: head, p: code, t: form }));
    expect(textIdeasOf({ l: list, p: code, t: form })).toEqual(textIdeasOf({ l: head, p: code, t: form }));
    expect(ownIdeaOfWord({ l: list, p: code })).toEqual(ownIdeaOfWord({ l: head, p: code }));
    expect(stemOf(list, form)).toEqual(stemOf(head, form));
    expect(numeralValue(word(list, code, form), 'grc')).toEqual(numeralValue(word(head, code, form), 'grc'));
  });
});

describe('the grammar tables are named by the headword', () => {
  it('a preposition list is its preposition, εἰμί list is εἰμί, a numeral list is its numeral', () => {
    expect(ownIdeaOfWord({ l: 'ἐκ, ἐξ', p: 'PREP' })).toBe('preposition-ek');
    expect(patternsOf({ l: 'εἰμί, εἶναι', p: 'V-PAI-3S', t: 'ἐστίν' })).toContain('eimi');
    expect(textIdeasOf({ l: 'εἰμί, εἶναι', p: 'V-PAI-3S', t: 'ἐστίν' })).toContain('enclitics');
    expect(numeralValue(word('δύο, δυοῖν', 'A-NPM-NUM', 'δύο'), 'grc')?.value).toBe(2);
  });
});

describe('the words of a Septuagint passage are the headwords', () => {
  it('a sound practice or a text a goal needs names ὕδωρ, not the list', () => {
    const chapter = chapterOf(word('ὕδωρ, ὕδατος', 'N-NSN', 'ὕδωρ'), word('ὕδωρ', 'N-NSN', 'ὕδωρ'));
    expect(passageWords([chapter])).toEqual(['ὕδωρ']);
  });

  it('a link that names the list finds the headword the lexicon holds on its own', () => {
    const only: LemmaLexicon = { 'ὕδωρ': { g: 'water', s: 'G5204', c: 'noun' } };
    expect(findWord('ὕδωρ, ὕδατος', only)?.lemma).toBe('ὕδωρ');
  });
});
