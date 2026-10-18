// Check on a passage lesson (mw-z370x5.2): rangeOf, the address of a range, the questions of a Check, the lesson row on the schedule and a link's range.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { JOHN_LESSONS } from '../../src/approaches/john-lessons';
import { lessonForRange, APPROACHES } from '../../src/approaches';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { gradedVerses } from '../../src/data/grammar/gradedVerses';
import { buildCheck, CHECK_QUESTIONS, PASS_SHARE, passes } from '../../src/data/grammar/passageCheck';
import { passagesOf, rangeOf } from '../../src/data/passage';
import { LESSON_KIND, lessonCheckPassed, listDue, tryAgainTomorrow } from '../../src/data/repositories';
import { DAY } from '../../src/data/schedule';
import { mulberry32 } from '../../src/data/quiz';
import { LESSON } from '../../src/review/kinds';
import { drawReviewRound } from '../../src/review/round';
import { openVerseRange, readerHash, readerOf } from '../../src/nav/route';
import { parseReference, resolveReference } from '../../src/nav/links';
import { DEFAULT_CHAPTER } from '../../src/data/readerChapter';

afterAll(() => db.close());

const john1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;

describe('rangeOf', () => {
  it('is the verses from first to last, under the heading it is given', () => {
    const range = rangeOf(john1.verses, 1, 4, '1 John 1:1-4');
    expect(range).toMatchObject({ heading: '1 John 1:1-4', first: 1, last: 4 });
    expect(range?.verses.map((v) => v.n)).toEqual([1, 2, 3, 4]);
  });

  it('cuts a range that runs past the chapter and is undefined when it holds no verse', () => {
    expect(rangeOf(john1.verses, 9, 40, 'x')).toMatchObject({ first: 9, last: 10 });
    expect(rangeOf(john1.verses, 30, 40, 'x')).toBeUndefined();
    expect(rangeOf(john1.verses, 4, 1, 'x')).toBeUndefined();
  });

  it('can be a range no heading starts or ends', () => {
    const passages = passagesOf(john1.verses);
    expect(passages.map((p) => [p.first, p.last])).toEqual([[1, 4], [5, 10]]);
    expect(rangeOf(john1.verses, 3, 6, 'x')?.verses).toHaveLength(4);
  });
});

describe('the address of a range', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));

  it('writes and reads p and pt, and drops pt that has no p or ends before it', () => {
    const hash = readerHash({ book: '1jn', chapter: 1, passage: 1, passageTo: 4 });
    expect(hash).toBe('#/?b=1jn&c=1&p=1&pt=4');
    expect(readerOf(hash)).toEqual({ book: '1jn', chapter: 1, passage: 1, passageTo: 4 });
    expect(readerOf('#/?b=1jn&c=1&pt=4')).toEqual({ book: '1jn', chapter: 1 });
    expect(readerOf('#/?b=1jn&c=1&p=4&pt=1')).toEqual({ book: '1jn', chapter: 1, passage: 4 });
  });

  it('openVerseRange pushes the range as a Back step of the Verse view', () => {
    openVerseRange({ book: '1jn', chapter: 1, from: 1, to: 4 });
    expect(window.location.hash).toBe('#/?b=1jn&c=1&p=1&pt=4');
    expect(window.history.state).toEqual({ verseView: true });
  });

  it('a link to a range names the range, and a one-verse range stays a verse', () => {
    expect(parseReference('1John.1.1-4')).toEqual({ book: '1jn', chapter: 1, verse: 1, to: 4 });
    expect(parseReference('1John.1.1-1')).toEqual({ book: '1jn', chapter: 1, verse: 1 });
    const index = { books: [{ code: '1jn', chapters: 5, verses: [10, 6, 24, 21, 21] }] } as never;
    expect(resolveReference('1John.1.1-4', index, DEFAULT_CHAPTER)).toMatchObject({ book: '1jn', chapter: 1, verse: 1, to: 4, notice: null });
    expect(resolveReference('1John.1.8-40', index, DEFAULT_CHAPTER)).toMatchObject({ verse: 8, to: 10 });
  });
});

describe('the lesson a range reads', () => {
  it('is found by its exact range in the chosen approach, and by no other', () => {
    const ladder = APPROACHES[0];
    expect(lessonForRange(ladder, '1jn', 1, 1, 4)?.lesson.lesson.title).toBe(JOHN_LESSONS[0].title);
    expect(lessonForRange(ladder, '1jn', 1, 1, 3)).toBeUndefined();
    expect(lessonForRange(ladder, 'rom', 8, 1, 11)).toBeUndefined();
  });
});

describe('the questions of a Check', () => {
  const graded = gradedVerses([john1], () => false, new Set());
  const check = (seed: number, max?: number) => buildCheck(john1, 1, 4, JOHN_LESSONS[0].ideas, graded, mulberry32(seed), max);

  it('asks a meaning and a parsing of each verse of the range, 8 in all, easiest verse first', () => {
    const questions = check(1);
    expect(questions).toHaveLength(CHECK_QUESTIONS);
    for (const verse of [1, 2, 3, 4]) expect(questions.filter((q) => q.ref === `1 John 1:${verse}`).map((q) => q.kind).sort()).toEqual(['meaning', 'parse']);
    const easiest = graded.filter((g) => g.verse <= 4).map((g) => `1 John 1:${g.verse}`);
    expect(questions.map((q) => q.ref).filter((r, i, all) => all.indexOf(r) === i)).toEqual(easiest);
  });

  it('asks the lesson’s own ideas first', () => {
    const asked = new Set(check(1).map((q) => q.ideaId));
    expect([...asked].some((id) => JOHN_LESSONS[0].ideas.includes(id))).toBe(true);
  });

  it('asks no more than the cap, and only of the verses of the range', () => {
    expect(check(1, 3)).toHaveLength(3);
    expect(buildCheck(john1, 5, 10, ['conditional'], graded, mulberry32(2)).length).toBeLessThanOrEqual(CHECK_QUESTIONS);
    expect(buildCheck(john1, 5, 10, ['conditional'], graded, mulberry32(2)).every((q) => /1 John 1:([5-9]|10)$/.test(q.ref ?? ''))).toBe(true);
  });

  it('is the same Check for the same seed', () => {
    expect(check(7).map((q) => [q.kind, q.ideaId, q.ref, q.right])).toEqual(check(7).map((q) => [q.kind, q.ideaId, q.ref, q.right]));
  });
});

describe('passing a Check', () => {
  it('passes at three quarters right and not under', () => {
    expect(PASS_SHARE).toBe(0.75);
    expect(passes(6, 8)).toBe(true);
    expect(passes(5, 8)).toBe(false);
    expect(passes(3, 4)).toBe(true);
    expect(passes(0, 0)).toBe(false);
  });
});

describe('the lesson on the schedule', () => {
  const KEY = 'passage:1jn.1.1-4';
  beforeEach(async () => {
    await db.open();
    await db.reviews.clear();
  });

  it('Try again tomorrow puts the lesson on the schedule, due in a day, and it is due then', async () => {
    const now = Date.now();
    await tryAgainTomorrow(KEY, now);
    expect(await db.reviews.get([LESSON_KIND, KEY])).toMatchObject({ kind: 'lesson', id: KEY, step: 0, due: now + DAY });
    expect(await listDue(LESSON_KIND, now)).toHaveLength(0);
    expect((await listDue(LESSON_KIND, now + DAY)).map((r) => r.id)).toEqual([KEY]);
  });

  it('a lesson already due is put back a day when he misses again', async () => {
    const now = Date.now();
    await db.reviews.put({ kind: LESSON_KIND, id: KEY, step: 2, due: now - DAY, lastWhen: now - 3 * DAY, lapses: 1, rights: 0 });
    await tryAgainTomorrow(KEY, now);
    expect(await db.reviews.get([LESSON_KIND, KEY])).toMatchObject({ step: 2, lapses: 1, due: now + DAY });
  });

  it('a Check that passes records the lesson’s row right; a lesson never put there gets no row', async () => {
    const now = Date.now();
    await lessonCheckPassed(KEY, now);
    expect(await db.reviews.get([LESSON_KIND, KEY])).toBeUndefined();
    await db.reviews.put({ kind: LESSON_KIND, id: KEY, step: 0, due: now - 1, lastWhen: now - DAY, lapses: 0, rights: 0 });
    await lessonCheckPassed(KEY, now);
    const row = await db.reviews.get([LESSON_KIND, KEY]);
    // one right keeps the step and the lesson comes back after its gap (src/data/schedule.ts nextReview)
    expect(row).toMatchObject({ step: 0, rights: 1, due: now + DAY, lastWhen: now });
  });

  it('Review counts a lesson in words and never draws one as an item', async () => {
    expect(LESSON.count(1)).toBe('1 lesson');
    expect(LESSON.count(2)).toBe('2 lessons');
    expect(await LESSON.draw([], () => 0.5)).toEqual([]);
  });

  it('a due lesson takes no place in a round: Review opens it from the start screen', async () => {
    const now = Date.now();
    await db.reviews.put({ kind: LESSON_KIND, id: KEY, step: 0, due: now - 1, lastWhen: now - DAY, lapses: 0, rights: 0 });
    const round = await drawReviewRound(() => 0.5, now, 10);
    expect(round.items.map((i) => i.kind as string)).not.toContain(LESSON_KIND);
    expect(round.due).toBe(0);
  });
});
