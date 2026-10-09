// The teach sheet's data (mw-bsf54t.4): teachWord (Got it, I know this), the skipped-for-today set and the verse woven for teaching.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { listDroppedLemmas, listWords, teachWord } from '../../src/data/repositories';
import { DAY, STEP_DAYS } from '../../src/data/schedule';
import { forgetSkipped, skipForToday, skippedToday } from '../../src/data/skipped';
import { weaveForTeaching } from '../../src/data/weave';
import { clearBus, latest } from '../../src/events/bus';

beforeEach(async () => {
  await db.open();
  await Promise.all([db.words.clear(), db.reviews.clear()]);
});
afterEach(() => {
  clearBus();
  forgetSkipped();
});

describe('teachWord', () => {
  it('Got it: a learning word from his reading, lesson 0, step 0 and due now', async () => {
    await teachWord('αὐτός', 'it/s/he', 'got-it', 1000);
    expect(await listWords()).toEqual([{ lemma: 'αὐτός', lemmas: ['αὐτός'], gloss: 'it/s/he', lesson: 0, source: 'frontier', state: 'learning', since: 1000 }]);
    expect(await db.reviews.get(['word', 'αὐτός'])).toMatchObject({ step: 0, due: 1000 });
    expect(latest('frontier-taught')).toEqual({ kind: 'frontier-taught', lemma: 'αὐτός', outcome: 'got-it' });
  });

  it('I know this: solid, at the 30-day step, due in 30 days', async () => {
    await teachWord('εἰς', 'toward', 'known', 1000);
    expect((await listWords())[0]).toMatchObject({ state: 'solid', source: 'frontier' });
    expect(await db.reviews.get(['word', 'εἰς'])).toMatchObject({ step: STEP_DAYS.indexOf(30), due: 1000 + 30 * DAY });
    expect(latest('frontier-taught')?.outcome).toBe('known');
  });

  it('a word already listed keeps its place and takes the state; a review row already there is kept', async () => {
    await db.words.add({ lemma: 'εἰς', lemmas: ['εἰς'], gloss: 'toward', lesson: 4, state: 'learning', since: 1 });
    await db.reviews.add({ kind: 'word', id: 'εἰς', step: 2, due: 5, lastWhen: 1, lapses: 1, rights: 1 });
    await teachWord('εἰς', 'toward', 'known', 1000);
    expect(await listWords()).toEqual([{ lemma: 'εἰς', lemmas: ['εἰς'], gloss: 'toward', lesson: 4, state: 'solid', since: 1000 }]);
    expect(await db.reviews.get(['word', 'εἰς'])).toMatchObject({ step: 2, due: 5 });
  });

  it('lists the lemmas of the words he dropped', async () => {
    await db.words.bulkAdd([
      { lemma: 'α', lemmas: ['α'], gloss: '', lesson: 1, state: 'dropped', since: 1 },
      { lemma: 'β', lemmas: ['β'], gloss: '', lesson: 1, state: 'solid', since: 1 },
    ]);
    expect([...(await listDroppedLemmas())]).toEqual(['α']);
  });
});

describe('the words skipped for today', () => {
  it('keeps a skip for the day, in NFC, and hands out the same set until it changes', () => {
    const day = new Date(2026, 9, 9, 10).getTime();
    expect(skippedToday(day).size).toBe(0);
    skipForToday('αὐτός'.normalize('NFD'), day);
    expect(skippedToday(day).has('αὐτός')).toBe(true);
    expect(skippedToday(day)).toBe(skippedToday(day));
  });

  it('forgets the skips on the next day', () => {
    const day = new Date(2026, 9, 9, 23).getTime();
    skipForToday('αὐτός', day);
    expect(skippedToday(day + 2 * 60 * 60 * 1000).size).toBe(0);
  });
});

describe('weaveForTeaching', () => {
  const verse: Verse = {
    n: 1,
    g: [
      { t: 'καί', tr: '', s: 'G2532', l: 'καί', p: 'CONJ' },
      { t: 'αὐτοῦ', tr: '', s: 'G846', l: 'αὐτός', p: 'P-GSM' },
      { t: 'λόγος', tr: '', s: 'G3056', l: 'λόγος', p: 'N-NSM' },
    ],
    e: [
      { t: 'And', g: [0] },
      { t: 'his', g: [1], s: [0] },
      { t: 'word', g: [2] },
    ],
  };

  it('stands the solid words and the new word in Greek, the new one marked; the rest stays English', () => {
    const woven = weaveForTeaching(verse, new Set(['καί']), 'αὐτός');
    expect(woven.map((w) => w && { greek: w.words.map((x) => x.t), learning: w.learning })).toEqual([
      { greek: ['καί'], learning: false },
      { greek: ['αὐτοῦ'], learning: true }, // a supplied chunk, which the plain weave leaves English
      null,
    ]);
  });
});
