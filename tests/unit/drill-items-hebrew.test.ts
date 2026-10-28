// The drill-items grind writes questions for a Hebrew idea from a Hebrew verse's words (mw-gdcyf98.21): the request for a Hebrew idea carries `language` 'he', each verse's `hebrew` and `hebrew_words` and
// the Hebrew ladder's idea; a Greek idea's request is as it was; the answer is checked against the Hebrew verse (a word with a maqaf or a prefix is one word); the instructions and the examples say so.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { buildDrillItemsRequest, checkedItems, isKeptQuestion, weakestMissed, type AnsweredItem, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { hebrewFormOf, hebrewIdeasOfWord } from '../../src/data/grammar/hebrew/wordQuestions';
import { ideaOf } from '../../src/data/grammar/ladder';
import { ideaOfAny, ladderFor } from '../../src/data/grammar/ladders';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { instructionsOf } from '../../scripts/grind-parts';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): unknown => JSON.parse(readFileSync(rel, 'utf8'));
const inputSchema = readJson('grinds/drill-items.input.schema.json') as Schema;
const answerSchema = readJson('grinds/drill-items.answer.schema.json') as Schema;
const genesis = readJson('public/data/gen/1.json') as Chapter;
const jonah = readJson('public/data/jon/1.json') as Chapter;
const romans = readJson('public/data/rom/8.json') as Chapter;

const ARTICLE = ideaOfAny('he-article');
const PERFECT = ideaOfAny('he-perfect');
const misses = (id: string, n = 2) => new Map([[id, n]]);

const request = (idea = ARTICLE, passage: Chapter[] = [genesis]): DrillItemsRequest => buildDrillItemsRequest([idea], misses(idea.id), passage) as DrillItemsRequest;

describe('the request for a Hebrew idea', () => {
  it('is the Hebrew ladder\'s idea over Hebrew verses, in the shape the input schema takes, and fits the grist', () => {
    const r = request();
    expect(validate(r, inputSchema)).toEqual([]);
    expect(new TextEncoder().encode(JSON.stringify(r)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(r.language).toBe('he');
    expect(r.ideas).toEqual([{ id: 'he-article', title: ARTICLE.title, what: ARTICLE.text, misses: 2 }]);
    expect(ladderFor('hbo').ideaOf('he-article').text).toBe(r.ideas[0].what);
    for (const verse of r.verses) {
      expect(verse.greek).toBeUndefined();
      expect(verse.hebrew).toBeTruthy();
      expect(verse.hebrew_words?.length).toBeGreaterThan(0);
      expect(verse.uses.length).toBeGreaterThan(0);
    }
  });

  it('writes a verse\'s hebrew pointed, with no cantillation, a word with a maqaf or a prefix whole, and its words with lemma, transliteration, gloss and parsing', () => {
    const r = request(PERFECT, [jonah]);
    const verse = r.verses.find((v) => v.ref === 'Jonah 1:2')!;
    expect(verse.hebrew).toContain('אֶל־ נִינְוֵה');
    expect(verse.hebrew).not.toMatch(/[֑-֯]/u);
    expect(verse.hebrew_words?.[0]).toEqual({ form: 'קוּם', lemma: expect.any(String), translit: expect.any(String), gloss: expect.any(String), parse: expect.stringContaining('Verb') });
    expect(verse.hebrew_words?.some((w) => w.form === 'וּקְרָא')).toBe(true);
    expect(verse.uses).toEqual([{ idea: 'he-perfect', form: 'עָלְתָה', parse: 'Verb - Qal - Perfect - third person feminine singular' }]);
  });

  it('names as `uses` only words whose parsing shows the idea', () => {
    const r = request();
    for (const verse of r.verses) {
      const chapter = genesis;
      const words = chapter.verses.find((v) => `Genesis 1:${v.n}` === verse.ref)!.g;
      for (const use of verse.uses) {
        const word = words.find((w) => hebrewFormOf(w) === use.form)!;
        expect(hebrewIdeasOfWord(chapter, word)).toContain(use.idea);
      }
    }
  });

  it('is null when the passage has no Hebrew verse that shows the idea (a Greek passage)', () => {
    expect(buildDrillItemsRequest([ARTICLE], misses('he-article'), [romans])).toBeNull();
  });

  it('is of one language: a Greek idea beside the Hebrew first idea is left out', () => {
    const r = buildDrillItemsRequest([ARTICLE, ideaOf('declension-2')], new Map([['he-article', 2], ['declension-2', 1]]), [genesis, romans]) as DrillItemsRequest;
    expect(r.ideas.map((i) => i.id)).toEqual(['he-article']);
    expect(r.verses.every((v) => v.hebrew !== undefined)).toBe(true);
  });

  it('leaves a Greek idea\'s request as it was: Greek verses, no `language`, no Hebrew field', () => {
    const r = buildDrillItemsRequest([ideaOf('declension-2')], misses('declension-2'), [readJson('public/data/1jn/1.json') as Chapter]) as DrillItemsRequest;
    expect(validate(r, inputSchema)).toEqual([]);
    expect('language' in r).toBe(false);
    expect(r.verses.length).toBeGreaterThan(0);
    for (const verse of r.verses) {
      expect(Object.keys(verse).sort()).toEqual(['english', 'greek', 'ref', 'uses']);
      expect(verse.greek).toBeTruthy();
    }
  });

  it('is asked for the Hebrew ideas a round missed', () => {
    const ids = weakestMissed(['he-article', 'he-article', 'declension-2', 'he-perfect', 'he-alphabet']).map((i) => i.id);
    expect(ids[0]).toBe('he-article');
    expect([...ids].sort()).toEqual(['declension-2', 'he-article', 'he-perfect']);
  });

  it('refuses a verse that has neither greek nor hebrew in the input schema', () => {
    const r = request();
    const bare = JSON.parse(JSON.stringify(r)) as DrillItemsRequest;
    delete bare.verses[0].hebrew;
    expect(validate(bare, inputSchema)).not.toEqual([]);
  });
});

describe('the items a Hebrew request is answered with', () => {
  const r = request();
  const verse = r.verses[0];
  const [shamayim, aretz] = verse.uses.map((u) => u.form);
  const TAP: AnsweredItem = {
    idea: 'he-article',
    kind: 'tap-form',
    ref: 'Genesis 1:1',
    prompt: 'Tap a word with the article',
    options: ['בָּרָא', shamayim, 'אֱלֹהִים', 'אֵת'],
    right: shamayim,
  };
  const MEANING: AnsweredItem = { idea: 'he-article', kind: 'meaning', ref: 'Genesis 1:1', prompt: 'What does this say?', form: aretz, options: ['the earth', 'a king', 'the sea', 'a tree'], right: 'the earth' };

  it('are in the answer schema\'s shape', () => {
    expect(validate({ items: [TAP, MEANING] }, answerSchema)).toEqual([]);
  });

  it('are drawn right to left: a tap-form on the verse\'s words, kept as a Hebrew question', () => {
    const [q] = checkedItems({ items: [TAP] }, r, [genesis]);
    expect(q).toMatchObject({ kind: 'tap-form', ideaId: 'he-article', lang: 'hbo', right: shamayim, ref: 'Genesis 1:1' });
    expect(q.options).toEqual(TAP.options);
    expect(isKeptQuestion(q)).toBe(true);
  });

  it('are drawn right to left and spoken in Hebrew: a meaning item says its Hebrew', () => {
    const [q] = checkedItems({ items: [MEANING] }, r, [genesis]);
    expect(q).toMatchObject({ kind: 'meaning', lang: 'hbo', form: aretz, say: aretz, right: 'the earth' });
  });

  it('drop an option that is not a word of the verse, or a word cut off its prefix', () => {
    expect(checkedItems({ items: [{ ...TAP, options: ['בָּרָא', shamayim, 'אֱלֹהִים', 'שָּׁמַיִם'] }] }, r, [genesis])).toEqual([]);
  });

  it('drop a tap-form item with a second word that shows the idea among the four', () => {
    expect(checkedItems({ items: [{ ...TAP, options: ['בָּרָא', shamayim, aretz, 'אֵת'] }] }, r, [genesis])).toEqual([]);
  });

  it('drop an item whose right word does not show the idea', () => {
    expect(checkedItems({ items: [{ ...TAP, right: 'בָּרָא' }] }, r, [genesis])).toEqual([]);
  });
});

describe('the grind says Hebrew', () => {
  const instructions = instructionsOf('drill-items');

  it('has a Hebrew section for the words, the maqaf and the prefixes, the tap-form on pointed forms and the parsing in plain words', () => {
    expect(instructions).toContain('## A Hebrew request');
    for (const word of ['`language`', '`hebrew`', '`hebrew_words`', 'maqaf', 'inseparable prefix', 'pointed', 'perfect', 'imperfect', 'qal', 'piel', 'construct', 'suffix']) expect(instructions).toContain(word);
  });

  it('has its worked examples for he-article and he-perfect', () => {
    const article = readJson('grinds/examples/drill-items/hebrew-article.json') as { request: DrillItemsRequest };
    const perfect = readJson('grinds/examples/drill-items/hebrew-qal-perfect.json') as { request: DrillItemsRequest };
    expect(article.request.ideas[0].id).toBe('he-article');
    expect(article.request.verses.map((v) => v.ref)).toEqual([1, 2, 3, 4, 5].map((n) => `Genesis 1:${n}`));
    expect(perfect.request.ideas[0].id).toBe('he-perfect');
    expect(perfect.request.verses.every((v) => v.ref.startsWith('Jonah 1:'))).toBe(true);
    expect(validate(article.request, inputSchema)).toEqual([]);
    expect(validate(perfect.request, inputSchema)).toEqual([]);
  });
});
