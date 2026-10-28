// What the tutor is told of his Hebrew (mw-gdcyf98.22): `learner` summarises per language. A Greek-only reader's line is the Greek one, in the shape it always had; a
// reader who chose Hebrew is told his Hebrew words, his place on the Hebrew grammar ladder, his place on the Hebrew reading ladder and how long since he last met a
// Hebrew word or idea; one who chose both is told both, each under its language's name.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, type Word } from '../../src/data/db';
import { DAY } from '../../src/data/schedule';
import { forgetLadders } from '../../src/data/readingLadder';
import { LEARNER_MAX_CHARS, LEARNER_HEBREW_MAX_CHARS, learnerSummary } from '../../src/data/learnerSummary';

const NOW = Date.UTC(2026, 9, 8, 15, 0, 0);
const HOUR = 3_600_000;

const greek = (lemma: string, state: Word['state'], since: number): Word => ({ lemma, lang: 'grc', lemmas: [], gloss: 'g', lesson: 0, state, since });
const hebrew = (lemma: string, state: Word['state'], since: number): Word => ({ lemma, lang: 'hbo', lemmas: [], gloss: 'g', lesson: 0, state, since });

/** The languages he reads, as the two dials stand. */
const read = async (greekLevel: number, hebrewLevel: number): Promise<void> => {
  await db.settings.bulkPut([
    { key: 'greekInterest', value: String(greekLevel) },
    { key: 'hebrewInterest', value: String(hebrewLevel) },
  ]);
};

beforeEach(async () => {
  await db.open();
  await Promise.all([db.words.clear(), db.reviews.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear(), db.readingHistory.clear(), db.ladder.clear()]);
  forgetLadders();
  vi.unstubAllGlobals();
});
afterAll(() => db.close());

const seedHebrew = async (): Promise<void> => {
  await db.words.bulkPut([hebrew('אֶרֶץ', 'solid', 0), hebrew('בָּרָא', 'solid', 0), hebrew('מַיִם', 'learning', NOW - HOUR), greek('θεός', 'solid', 0), greek('λόγος', 'learning', NOW - 3 * DAY)]);
  await db.grammarLevels.bulkPut([
    { id: 'he-alphabet', level: 'solid', since: 1, how: 'placement' },
    { id: 'he-gender', level: 'solid', since: 2, how: 'sheet' },
    { id: 'he-number', level: 'frontier', since: 3, how: 'sheet' },
  ]);
};

describe('a Greek-only reader', () => {
  it('is told the Greek line in the shape it always had, and nothing of Hebrew', async () => {
    await read(5, 0);
    await seedHebrew();
    const text = await learnerSummary(NOW);
    expect(text).toBe('solid 1 word; learning: λόγος; new today: none; due now: 0');
    expect(text).not.toMatch(/Hebrew|ladder|אֶרֶץ/);
  });
});

describe('a Hebrew reader', () => {
  it('is told three Hebrew words and two ideas: the words, the ladder place and what is next', async () => {
    await read(0, 3);
    await seedHebrew();
    const text = await learnerSummary(NOW);
    expect(text).toContain('Hebrew: solid 2 words; learning: מַיִם; new today: מַיִם');
    expect(text).toMatch(/ladder: 2 of \d+ ideas known \([^)]*Gender[^)]*\); learning: Number[^;]*; next: \S/);
    expect(text).toMatch(/due now: \d+$/);
    // the Greek words of a reader who dropped Greek are not his progress now
    expect(text).not.toMatch(/Greek|θεός|λόγος/);
    expect(text.length).toBeLessThanOrEqual(LEARNER_HEBREW_MAX_CHARS);
  });

  it('is told how long since he last met a Hebrew word or idea', async () => {
    await read(0, 3);
    await seedHebrew();
    await db.reviews.bulkPut([
      { kind: 'word', id: 'אֶרֶץ', step: 2, due: NOW, lastWhen: NOW - 12 * DAY, lapses: 0, rights: 1 },
      { kind: 'grammar', id: 'he-gender', step: 1, due: NOW, lastWhen: NOW - 20 * DAY, lapses: 0, rights: 1 },
      { kind: 'word', id: 'θεός', step: 1, due: NOW, lastWhen: NOW - 2 * DAY, lapses: 0, rights: 1 },
    ]);
    expect(await learnerSummary(NOW)).toContain('last seen 12 days ago');
  });

  it('says nothing of rust before he has met a Hebrew item', async () => {
    await read(0, 3);
    await seedHebrew();
    expect(await learnerSummary(NOW)).not.toContain('last seen');
  });

  it('is told his place on the Hebrew reading ladder once he has read a verse well', async () => {
    await read(0, 3);
    await seedHebrew();
    await db.readingHistory.put({ ref: 'gen.1.1', lang: 'he', at: NOW - DAY, verdict: 'well-read', words: [] });
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ['gen.1.1', 'gen.1.2', 'gen.1.3'].map((ref) => ({ ref, score: 1, why: [] })) }));
    expect(await learnerSummary(NOW)).toContain('reading ladder: next Genesis 1:2');
  });

  it('tells nothing of the reading ladder to one who has not started it', async () => {
    await read(0, 3);
    await seedHebrew();
    expect(await learnerSummary(NOW)).not.toContain('reading ladder');
  });
});

describe('a reader of both', () => {
  it('is told each language under its name, the Greek line as it always was', async () => {
    await read(5, 3);
    await seedHebrew();
    const text = await learnerSummary(NOW);
    expect(text).toContain('Greek: solid 1 word; learning: λόγος; new today: none');
    expect(text).toContain('Hebrew: solid 2 words; learning: מַיִם; new today: מַיִם');
    expect(text.indexOf('Greek:')).toBeLessThan(text.indexOf('Hebrew:'));
    expect(text.length).toBeLessThanOrEqual(LEARNER_HEBREW_MAX_CHARS);
  });

  it('keeps the whole line under its cap with a long list of learning words in each language', async () => {
    await read(5, 3);
    await db.words.bulkPut(Array.from({ length: 30 }, (_, i) => greek(`${'α'.repeat(30)}${i}`, 'learning', NOW - (i + 1) * HOUR)));
    await db.words.bulkPut(Array.from({ length: 30 }, (_, i) => hebrew(`${'ה'.repeat(30)}${i}`, 'learning', NOW - (i + 1) * HOUR)));
    const text = await learnerSummary(NOW);
    expect(text.length).toBeLessThanOrEqual(LEARNER_HEBREW_MAX_CHARS);
    expect(text.length).toBeGreaterThan(LEARNER_MAX_CHARS);
    expect(text).toMatch(/due now: 0$/);
  });
});
