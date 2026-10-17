// The 'sentences' tier of the ladder (mw-br588b.2): one usage idea for each use the finder (src/data/grammar/uses.ts) knows, needing the word ideas it is built of,
// counted in what a passage needs with the use's words as the example, shown on the idea sheet as the verse with the use's words marked, and placed in the approaches.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bmaTutor } from '../../src/approaches/bma-tutor';
import { ladder } from '../../src/approaches/ladder';
import { lessonOf, orderOf } from '../../src/approaches';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { exampleGloss, exampleNote, ideaExamples } from '../../src/data/grammar/ideaSheet';
import { LADDER, TIERS, ideaOf, ideasBelow } from '../../src/data/grammar/ladder';
import { passageNeeds } from '../../src/data/grammar/needs';
import { USE_IDS, usesOf } from '../../src/data/grammar/uses';
import { teachOf } from '../../src/data/grammar/teach';

const chapterOf = (book: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const load = async (book: string, n: number): Promise<Chapter> => chapterOf(book, n);
const SENTENCES = LADDER.filter((i) => i.tier === 'sentences');
const below = (id: string): string[] => ideasBelow(id).map((i) => i.id);

describe('the sentences tier', () => {
  it('comes after the joiners and holds one idea for each use the finder knows, in the finder\'s order', () => {
    expect(TIERS.at(-1)).toBe('sentences');
    expect(TIERS.at(-2)).toBe('joiners');
    expect(SENTENCES.map((i) => i.id)).toEqual([...USE_IDS]);
    expect(SENTENCES).toHaveLength(15);
  });

  it('gives each idea no term, a text of under 80 words with a Greek example, and needs of lower rungs', () => {
    for (const idea of SENTENCES) {
      expect(idea.terms, idea.id).toEqual([]);
      expect(idea.text.trim().split(/\s+/).length, idea.id).toBeLessThan(80);
      expect(idea.text, idea.id).toMatch(/[Ͱ-Ͽἀ-῿]/);
      expect(idea.needs.length, idea.id).toBeGreaterThan(0);
      for (const need of idea.needs) expect(ideaOf(need).rung, `${idea.id} needs ${need}`).toBeLessThan(idea.rung);
      expect(idea.title, idea.id).not.toMatch(/[_-]/);
    }
  });

  it('builds each idea on the word ideas it is made of', () => {
    expect(below('agreement')).toEqual(expect.arrayContaining(['article', 'adjective', 'case-genitive', 'number-plural', 'gender-neuter']));
    expect(ideaOf('clause-hina').needs).toEqual(expect.arrayContaining(['conjunction', 'mood-subjunctive']));
    expect(ideaOf('genitive-absolute').needs).toEqual(expect.arrayContaining(['mood-participle', 'case-genitive']));
    expect(ideaOf('periphrastic').needs).toEqual(expect.arrayContaining(['eimi', 'mood-participle']));
    expect(ideaOf('infinitive-articular').needs).toEqual(expect.arrayContaining(['mood-infinitive', 'article', 'preposition']));
    expect(ideaOf('condition').needs).toEqual(expect.arrayContaining(['conditional', 'mood-indicative', 'mood-subjunctive']));
  });

  it('has the titles the story gave, in plain words', () => {
    expect(ideaOf('clause-hina').title).toBe('A clause with ἵνα');
    expect(ideaOf('clause-hoti').title).toBe('A clause with ὅτι');
    expect(ideaOf('condition').title).toBe('If: the three conditions');
    expect(ideaOf('article-substantival').title).toBe('The article standing alone');
    expect(ideaOf('article-position').title).toBe('Where the adjective stands');
    expect(ideaOf('postpositive').title).toBe('Words that come second');
    expect(ideaOf('genitive-absolute').title).toBe('The genitive absolute');
    expect(ideaOf('periphrastic').title).toBe('Being plus a participle');
  });

  it('has a card for each idea, and at least one Drill it step', () => {
    for (const idea of SENTENCES) {
      expect(teachOf(idea.id).worked.length, idea.id).toBeGreaterThan(0);
      expect(drillSteps(idea.id, { passage: [chapterOf('1jn', 1)] }).length, idea.id).toBeGreaterThan(0);
      expect(drillSteps(idea.id).length, `${idea.id} with no passage`).toBeGreaterThan(0);
    }
  });

  it('is the ladder approach\'s last level, titled Sentences', () => {
    const levels = ladder.stages[0].levels;
    expect(levels.at(-1)?.title).toBe('Sentences');
    expect(levels.at(-1)?.lessons.map((l) => l.ideas[0])).toEqual([...USE_IDS]);
  });
});

describe('every use id the finder can return is an idea of the ladder', () => {
  it('holds for the ids it lists and for the ids it finds in 1 John, Romans 8 and John 1', () => {
    for (const id of USE_IDS) expect(() => ideaOf(id), id).not.toThrow();
    const found = new Set<string>();
    for (const [book, n] of [['1jn', 1], ['1jn', 2], ['1jn', 3], ['rom', 8], ['jhn', 1], ['mat', 5], ['act', 2]] as const) {
      for (const verse of chapterOf(book, n).verses) for (const use of usesOf(verse)) found.add(use.id);
    }
    expect(found.size).toBeGreaterThan(8);
    for (const id of found) expect(SENTENCES.map((i) => i.id), id).toContain(id);
  });
});

describe('what a passage needs, counting the sentence ideas', () => {
  it('counts one for each use, with the use\'s head word (or its first) as the example', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1 }, load, BOOK_INDEX);
    const idea = (id: string) => needs.ideas.find((i) => i.id === id);
    expect(idea('clause-hina')).toMatchObject({ count: 3, example: { form: 'ἔχητε', code: 'V-PAS-2P', ref: '1jn.1.3' } });
    expect(idea('condition')).toMatchObject({ count: 5, example: { form: 'εἴπωμεν', ref: '1jn.1.6' } });
    expect(idea('clause-hoti')).toMatchObject({ count: 4, example: { form: 'ὅτι', ref: '1jn.1.5' } });
    expect(idea('postpositive')).toMatchObject({ example: { form: 'δὲ', ref: '1jn.1.3' } });
    const sentenceIds = needs.ideas.map((i) => i.id).filter((id) => ideaOf(id).tier === 'sentences');
    expect(sentenceIds.length).toBeGreaterThan(3);
    expect(needs.ideas.at(-1)?.id).toBe(sentenceIds.at(-1));
  });

  it('counts none for a verse that has none', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, load, BOOK_INDEX);
    expect(needs.ideas.map((i) => i.id)).not.toContain('clause-hina');
    expect(needs.ideas.map((i) => i.id)).not.toContain('condition');
  });
});

describe('the examples of a sentence idea', () => {
  it('are up to three uses, each the verse with the use\'s words marked', () => {
    const found = ideaExamples('clause-hina', [chapterOf('1jn', 1)]);
    expect(found.map((e) => e.reference)).toEqual(['1 John 1:3', '1 John 1:4', '1 John 1:9']);
    expect(found.map((e) => e.parts.filter((p) => p.marked).map((p) => p.text))).toEqual([['ἵνα', 'ἔχητε'], ['ἵνα', 'ᾖ'], ['ἵνα', 'ἀφῇ']]);
    expect(found[0].parts.map((p) => p.text).join('')).toBe('Ὃ ἑωράκαμεν καὶ ἀκηκόαμεν ἀπαγγέλλομεν ὑμῖν ἵνα καὶ ὑμεῖς κοινωνίαν ἔχητε μεθ\' ἡμῶν καὶ ἡ κοινωνία δὲ ἡ ἡμετέρα μετὰ τοῦ πατρὸς καὶ μετὰ τοῦ υἱοῦ αὐτοῦ Ἰησοῦ χριστοῦ');
    expect(found[0].word.t).toBe('ἔχητε');
  });

  it('are never more than three, and come from different verses first', () => {
    const found = ideaExamples('agreement', [chapterOf('1jn', 1)]);
    expect(found.map((e) => e.reference)).toEqual(['1 John 1:1', '1 John 1:2', '1 John 1:3']);
    expect(found[0].parts.filter((p) => p.marked).map((p) => p.text)).toEqual(['τοῖς', 'ὀφθαλμοῖς']);
    expect(found[0].word.t).toBe('ὀφθαλμοῖς');
    expect(ideaExamples('agreement', [chapterOf('1jn', 1)], 1).map((e) => e.reference)).toEqual(['1 John 1:1', '1 John 1:1', '1 John 1:1']);
    expect(ideaExamples('agreement', [chapterOf('1jn', 1)], 1, 2)).toHaveLength(2);
  });

  it('give the English the verse renders the use with, and a speaker the use\'s words', () => {
    const [first] = ideaExamples('clause-hina', [chapterOf('1jn', 1)]);
    expect(first.english).toBe('so that … may have');
    expect(exampleGloss(ideaOf('clause-hina'), first)).toBe(first.english);
    expect(exampleNote(ideaOf('clause-hina'), first)).toBeUndefined();
  });
});

describe('the lessons that name the sentence ideas', () => {
  const place = (id: string) => lessonOf(bmaTutor, id)?.lesson.title;

  it('are the BMA clause lessons of level 5, each after the ideas it needs', () => {
    expect(place('condition')).toBe('Clauses of condition and purpose');
    expect(place('clause-hina')).toBe('Clauses of condition and purpose');
    expect(place('agreement')).toBe('Clauses that say who or which');
    expect(place('article-substantival')).toBe('Clauses that say who or which');
    expect(place('infinitive-articular')).toBe('Purpose and result with the infinitive');
    expect(place('infinitive-complement')).toBe('Purpose and result with the infinitive');
    expect(place('participle-adverbial')).toBe('Clauses built on a participle');
    expect(place('genitive-absolute')).toBe('Clauses built on a participle');
    expect(place('periphrastic')).toBe('Being plus a participle');
    expect(place('postpositive')).toBe('Long sentences');
    expect(place('article-position')).toBe('Long sentences');
    expect(place('subjunctive-hortatory')).toBe('What may happen');
    expect(place('prohibition')).toBe('No, not and do not');
    expect(place('ou-me')).toBe('No, not and do not');
    expect(place('clause-hoti')).toBeDefined();
    for (const level of bmaTutor.stages[0].levels) expect(level.lessons, level.title).toHaveLength(12);
  });

  it('put no idea before what it needs, in the BMA record and in the ladder', () => {
    for (const approach of [bmaTutor, ladder]) {
      const order = orderOf(approach);
      const early = SENTENCES.flatMap((idea) => idea.needs.filter((need) => order.indexOf(need) > order.indexOf(idea.id)).map((need) => `${approach.id}: ${idea.id} before ${need}`));
      expect(early).toEqual([]);
    }
  });
});
