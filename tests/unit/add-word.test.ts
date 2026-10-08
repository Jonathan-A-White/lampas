// addWordToLearn and wordIsListed (mw-5r3p30.44): a word from the Talk answer goes on the words-to-learn list by its lemma.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { addLemmaToLearn } from '../../src/data/answerWord';
import { db } from '../../src/data/db';
import { forgetLexicon } from '../../src/data/lexicon';
import { addWordToLearn, listWords, setWordState, wordIsListed } from '../../src/data/repositories';

beforeEach(async () => {
  await db.open();
  await db.words.clear();
});

describe('addWordToLearn', () => {
  it('adds the headword as a learning word with no lesson, and says it added it', async () => {
    expect(await addWordToLearn('σάρξ, σαρκός, ἡ', 'flesh', 5)).toBe('added');
    expect(await listWords()).toEqual([{ lemma: 'σάρξ', lemmas: ['σάρξ'], gloss: 'flesh', lesson: 0, state: 'learning', since: 5 }]);
  });

  it('adds a word once: the second time it says it was already there and changes nothing', async () => {
    await addWordToLearn('σάρξ', 'flesh', 5);
    expect(await addWordToLearn('σάρξ', 'other', 9)).toBe('already');
    expect(await db.words.count()).toBe(1);
    expect((await listWords())[0]).toMatchObject({ gloss: 'flesh', since: 5 });
  });

  it('finds a word by a lexicon lemma too, and a solid word counts as listed', async () => {
    await db.words.add({ lemma: 'εἶπεν', lemmas: ['λέγω', 'εἶπον'], gloss: 'said', lesson: 3, state: 'solid', since: 1 });
    expect(await addWordToLearn('λέγω')).toBe('already');
    expect(await wordIsListed('εἶπον')).toBe(true);
    expect(await db.words.count()).toBe(1);
  });

  it('puts a dropped word back to learning', async () => {
    await addWordToLearn('σάρξ', 'flesh', 5);
    await setWordState('σάρξ', 'dropped', 6);
    expect(await wordIsListed('σάρξ')).toBe(false);
    expect(await addWordToLearn('σάρξ', '', 7)).toBe('added');
    expect((await listWords())[0]).toMatchObject({ state: 'learning', since: 7, gloss: 'flesh' });
  });

  it('writes the lemma in NFC and ignores a blank one', async () => {
    expect(await addWordToLearn('σάρξ'.normalize('NFD'))).toBe('added');
    expect(await wordIsListed('σάρξ'.normalize('NFC'))).toBe(true);
    expect(await addWordToLearn('  ')).toBe('ignored');
    expect(await db.words.count()).toBe(1);
  });
});

// A lemma the open chapter does not use (mw-5r3p30.52): its gloss and part of speech come from the whole text's lexicon.
describe('addLemmaToLearn', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const scope = { title: 'Romans 8', chapter, verse: null };

  beforeEach(() => {
    forgetLexicon();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) !== '/data/lexicon.json') return new Response('not found', { status: 404 });
        return new Response(readFileSync('public/data/lexicon.json', 'utf8'), { status: 200 });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores the lexicon gloss and part of speech of a lemma that is not in the open chapter', async () => {
    expect(chapter.verses.flatMap((v) => v.g).some((w) => w.l === 'προσκυνέω')).toBe(false);
    expect(await addLemmaToLearn(scope, 'προσκυνέω', 5)).toEqual({ headword: 'προσκυνέω', result: 'added' });
    expect(await listWords()).toEqual([{ lemma: 'προσκυνέω', lemmas: ['προσκυνέω'], gloss: 'to worship', pos: 'verb', lesson: 0, state: 'learning', since: 5 }]);
  });

  it('takes a lemma of the open chapter from the lexicon too, with its part of speech', async () => {
    await addLemmaToLearn(scope, 'σάρξ', 5);
    expect(await listWords()).toMatchObject([{ lemma: 'σάρξ', gloss: 'flesh', pos: 'noun' }]);
  });

  it('adds nothing for a lemma the lexicon does not know, and says so', async () => {
    expect(await addLemmaToLearn(scope, 'ζζζ')).toEqual({ headword: 'ζζζ', result: 'unknown' });
    expect(await db.words.count()).toBe(0);
  });

  it('says a listed word is already there, even one the lexicon does not know', async () => {
    await db.words.add({ lemma: 'ζζζ', lemmas: ['ζζζ'], gloss: 'mine', lesson: 1, state: 'solid', since: 1 });
    expect(await addLemmaToLearn(scope, 'ζζζ')).toEqual({ headword: 'ζζζ', result: 'already' });
  });

  it('adds with the chapter gloss when the lexicon cannot be loaded, rather than failing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    expect(await addLemmaToLearn(scope, 'σάρξ', 5)).toEqual({ headword: 'σάρξ', result: 'added' });
    expect(await listWords()).toMatchObject([{ lemma: 'σάρξ', gloss: 'flesh' }]);
  });

  it('ignores a blank lemma', async () => {
    expect(await addLemmaToLearn(scope, '  ')).toEqual({ headword: '', result: 'ignored' });
  });
});
