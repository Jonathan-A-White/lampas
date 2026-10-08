// addWordToLearn and wordIsListed (mw-5r3p30.44): a word from the Talk answer goes on the words-to-learn list by its lemma.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
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
