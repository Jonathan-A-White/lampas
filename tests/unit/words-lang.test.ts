// A word of his list carries its language (mw-gdcyf98.16): Dexie v32 stamps every stored word 'grc', an add writes the language its caller names,
// the solid and learning lemma lists can be asked for one language (no argument is every language), and a pointed Hebrew headword is kept whole.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addLemmaToLearn } from '../../src/data/answerWord';
import { NO_CHAPTER } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { languageOfLemma, normaliseLemma } from '../../src/data/lemma';
import { forgetLexicon, lookupLemma } from '../../src/data/lexicon';
import { addImportedWords, addWordToLearn, listLearningLemmas, listSolidLemmas, listWords, teachWord, wordIsListed } from '../../src/data/repositories';
import type { TalkScope } from '../../src/services/talk';

const BARA = 'בָּרָא';
const KING = 'מֶ֫לֶךְ';

afterAll(() => db.close());

describe('the v32 upgrade', () => {
  it('stamps every word stored before it lang "grc", and a second open changes nothing', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(31).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
      passageLessons: 'key, state',
      pictureRefs: 'hash, at',
      talkSummaries: 'ref',
      library: 'id, kind',
      exportRows: 'resource',
      verseLists: '++id, created',
      recalls: '++id, [ref+lang], when',
      diagrams: '[ref+lang+version]',
    });
    await old.open();
    await old.table('words').bulkPut([
      { lemma: 'λόγος', lemmas: ['λόγος'], gloss: 'word', lesson: 1, state: 'solid', since: 1 },
      { lemma: 'ἀγάπη', lemmas: ['ἀγάπη'], gloss: 'love', lesson: 0, source: 'frontier', state: 'learning', since: 2 },
    ]);
    old.close();

    await db.open();
    expect(db.verno).toBe(34);
    expect((await listWords()).map((w) => [w.lemma, w.lang, w.gloss, w.state, w.source])).toEqual([
      ['λόγος', 'grc', 'word', 'solid', undefined],
      ['ἀγάπη', 'grc', 'love', 'learning', 'frontier'],
    ]);

    db.close();
    await db.open();
    expect((await listWords()).every((w) => w.lang === 'grc')).toBe(true);
  });
});

describe('a word carries its language', () => {
  beforeEach(async () => {
    await db.open();
    await db.words.clear();
    await db.reviews.clear();
  });

  it('is Greek for the Greek callers that do not say, and Hebrew where the caller names it', async () => {
    await addWordToLearn('σάρξ, σαρκός, ἡ', 'flesh', 5);
    await addWordToLearn(BARA, 'to create', 6, 'verb', 'hbo');
    await addImportedWords([{ ok: true, line: 'λόγος', headword: 'λόγος', lemmas: ['λόγος'], gloss: 'word', lesson: 2 }], 7);
    await teachWord('θεός', 'God', 'got-it', 8);
    await teachWord(KING, 'king', 'known', 9, 'hbo');
    const langs = Object.fromEntries((await listWords()).map((w) => [w.lemma, w.lang]));
    expect(langs).toEqual({ 'σάρξ': 'grc', [BARA]: 'hbo', 'λόγος': 'grc', 'θεός': 'grc', [KING]: 'hbo' });
    expect(await db.words.get(BARA)).toMatchObject({ lemma: BARA, lemmas: [BARA], gloss: 'to create', pos: 'verb', lang: 'hbo' });
  });

  it('is asked of the lists: no argument is every language, so the Greek weave and the Hebrew weave each keep working', async () => {
    await db.words.bulkPut([
      { lemma: 'λόγος', lang: 'grc', lemmas: ['λόγος'], gloss: 'word', lesson: 1, state: 'solid', since: 1 },
      { lemma: KING, lang: 'hbo', lemmas: [KING], gloss: 'king', lesson: 0, state: 'solid', since: 1 },
      { lemma: 'ἀγάπη', lang: 'grc', lemmas: ['ἀγάπη'], gloss: 'love', lesson: 1, state: 'learning', since: 1 },
      { lemma: BARA, lang: 'hbo', lemmas: [BARA], gloss: 'to create', lesson: 0, state: 'learning', since: 1 },
    ]);
    expect([...(await listSolidLemmas())].sort()).toEqual(['λόγος', KING].sort());
    expect([...(await listSolidLemmas('grc'))]).toEqual(['λόγος']);
    expect([...(await listSolidLemmas('hbo'))]).toEqual([KING]);
    expect([...(await listLearningLemmas())].sort()).toEqual(['ἀγάπη', BARA].sort());
    expect([...(await listLearningLemmas('grc'))]).toEqual(['ἀγάπη']);
    expect([...(await listLearningLemmas('hbo'))]).toEqual([BARA]);
  });

  it('keeps a pointed Hebrew headword whole: a comma or a maqaf in it does not cut it', () => {
    expect(normaliseLemma(BARA)).toEqual({ headword: BARA, lemmas: [BARA] });
    const twin = 'יְרוּשָׁלִַ֫ם, יְרוּשְׁלֵם';
    expect(normaliseLemma(twin).headword).toBe(twin);
    expect(normaliseLemma('מִן־').headword).toBe('מִן־');
    expect(normaliseLemma('σάρξ, σαρκός, ἡ').headword).toBe('σάρξ');
    expect(languageOfLemma(BARA)).toBe('hbo');
    expect(languageOfLemma('σάρξ')).toBe('grc');
  });

  it('finds a listed Hebrew word by its headword', async () => {
    await addWordToLearn(BARA, 'to create', 6, 'verb', 'hbo');
    expect(await wordIsListed(BARA)).toBe(true);
    expect(await addWordToLearn(BARA, '', 7, '', 'hbo')).toBe('already');
  });
});

describe('a lemma the Talk answer names, by language', () => {
  const scope: TalkScope = { title: 'Genesis 1', chapter: NO_CHAPTER, verse: null };
  beforeEach(async () => {
    await db.open();
    await db.words.clear();
    forgetLexicon();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const lexicon = url.endsWith('lexicon-hbo.json') ? { [BARA]: { g: 'to create', s: 'H1254', c: 'verb' } } : { 'σάρξ': { g: 'flesh', s: 'G4561', c: 'noun' } };
        return new Response(JSON.stringify(lexicon));
      }),
    );
  });

  it('looks a Hebrew lemma up in the Hebrew lexicon and lists it as a Hebrew word', async () => {
    expect(await lookupLemma(BARA, 'hbo')).toEqual({ g: 'to create', s: 'H1254', c: 'verb' });
    expect(await lookupLemma(BARA)).toBeUndefined();
    expect(await addLemmaToLearn(scope, BARA, 5)).toEqual({ headword: BARA, result: 'added' });
    expect(await db.words.get(BARA)).toMatchObject({ lang: 'hbo', gloss: 'to create', pos: 'verb' });
    expect(await addLemmaToLearn(scope, 'σάρξ', 6)).toEqual({ headword: 'σάρξ', result: 'added' });
    expect(await db.words.get('σάρξ')).toMatchObject({ lang: 'grc', gloss: 'flesh' });
  });
});
