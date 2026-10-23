// A passage lesson is a step of the approach (mw-z370x5.1): a lesson may name a passage, stepsOf keeps it after its ideas, its state is kept in the
// passageLessons table, and Learn next offers 'Read 1 John 1:1-4' once its ideas are at least frontier.
import Dexie from 'dexie';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { APPROACHES, orderOf, parsePassageKey, passageKey, passageLabel, stepsOf, type GrammarApproach } from '../../src/approaches';
import { bmaTutor } from '../../src/approaches/bma-tutor';
import { ladder } from '../../src/approaches/ladder';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { learnNext, nextLessonTitle, type PassageContext } from '../../src/data/grammar/goalProgress';
import type { Level, PassageNeeds } from '../../src/data/grammar/needs';
import { clearBus, subscribe } from '../../src/events/bus';
import { listPassageLessons, markPassed, markRead } from '../../src/data/repositories/passageLessons';
import { fixturePath } from '../support/fixture-path';

afterAll(() => db.close());

const lessonsOf = (a: GrammarApproach) => a.stages.flatMap((s) => s.levels.flatMap((l) => l.lessons));
const levelSix = bmaTutor.stages[0].levels[5];

describe('the key of a passage', () => {
  it('writes passage:1jn.1.1-4 and reads it back', () => {
    const passage = { book: '1jn', chapter: 1, from: 1, to: 4 };
    expect(passageKey(passage)).toBe('passage:1jn.1.1-4');
    expect(parsePassageKey('passage:1jn.1.1-4')).toEqual(passage);
    expect(parsePassageKey('passage:rom.12.1-2')).toEqual({ book: 'rom', chapter: 12, from: 1, to: 2 });
  });

  it('refuses what is not a key', () => {
    for (const bad of ['', 'passage:', 'passage:1jn.1', 'passage:1jn.x.1-4', '1jn.1.1-4', 'passage:1jn.1.4-1']) expect(parsePassageKey(bad), bad).toBeUndefined();
  });

  it('labels a range as he would say it', () => {
    expect(passageLabel({ book: '1jn', chapter: 1, from: 1, to: 4 })).toBe('1 John 1:1-4');
    expect(passageLabel({ book: 'rom', chapter: 12, from: 2, to: 2 })).toBe('Romans 12:2');
  });
});

describe('stepsOf', () => {
  it('has a passage step for each of the twelve level 6 lessons, each after its ideas', () => {
    const steps = stepsOf(bmaTutor);
    for (const lesson of levelSix.lessons) {
      expect(lesson.passage, lesson.title).toBeDefined();
      const at = steps.findIndex((s) => s.kind === 'passage' && s.lesson.lesson === lesson);
      expect(at, lesson.title).toBeGreaterThanOrEqual(0);
      for (const id of lesson.ideas) {
        expect(steps.findIndex((s) => s.kind === 'idea' && s.id === id), `${lesson.title}: ${id}`).toBeLessThan(at);
      }
      const step = steps[at];
      if (step.kind === 'passage') {
        expect(step.key).toBe(passageKey(lesson.passage!));
        expect(step.passage).toEqual(lesson.passage);
      }
    }
  });

  it('keeps the ideas exactly as orderOf gives them', () => {
    for (const a of [bmaTutor, ladder, fixturePath]) {
      expect(stepsOf(a).flatMap((s) => (s.kind === 'idea' ? [s.id] : [])), a.id).toEqual(orderOf(a));
    }
  });

  it('puts the passage step of the Lampas ladder after every idea', () => {
    const steps = stepsOf(ladder);
    const first = steps.findIndex((s) => s.kind === 'passage');
    expect(first).toBeGreaterThan(0);
    expect(steps.slice(first).every((s) => s.kind === 'passage')).toBe(true);
    expect(steps.filter((s) => s.kind === 'passage')).toHaveLength(12);
  });

  it('names no passage step twice', () => {
    for (const a of [bmaTutor, ladder]) {
      const keys = stepsOf(a).flatMap((s) => (s.kind === 'passage' ? [s.key] : []));
      expect(new Set(keys).size, a.id).toBe(keys.length);
    }
  });
});

describe('every passage of both approaches', () => {
  it('names a book of books.ts and a verse range the index has', () => {
    const lessons = [...lessonsOf(bmaTutor), ...lessonsOf(ladder)].filter((l) => l.passage);
    expect(lessons.length).toBeGreaterThanOrEqual(12);
    for (const { title, passage } of lessons) {
      const p = passage!;
      expect(BOOKS.map((b) => b.code), title).toContain(p.book);
      const info = BOOK_INDEX.books.find((b) => b.code === p.book);
      expect(info, title).toBeDefined();
      expect(p.chapter, title).toBeGreaterThanOrEqual(1);
      expect(p.chapter, title).toBeLessThanOrEqual(info!.chapters);
      expect(p.from, title).toBeGreaterThanOrEqual(1);
      expect(p.to, title).toBeGreaterThanOrEqual(p.from);
      expect(p.to, title).toBeLessThanOrEqual(info!.verses[p.chapter - 1]);
    }
  });

  it('gives the lessons that read a letter, an argument, an appeal and a participle a passage of ours', () => {
    const titled = (title: string) => lessonsOf(bmaTutor).find((l) => l.title === title)?.passage;
    expect(titled('Reading Paul: the opening of a letter')).toEqual({ book: 'rom', chapter: 1, from: 1, to: 7 });
    expect(titled('Reading Paul: an argument')).toEqual({ book: 'rom', chapter: 8, from: 31, to: 39 });
    expect(titled('Reading Paul: an appeal')).toEqual({ book: 'rom', chapter: 12, from: 1, to: 2 });
    expect(titled('Being plus a participle')).toBeDefined();
  });
});

describe('Learn next walks the steps', () => {
  const john = ladder.stages[1].levels[0].lessons;
  const neededOf = (ids: string[]): Pick<PassageNeeds, 'ideas'> => ({ ideas: ids.map((id) => ({ id }) as PassageNeeds['ideas'][number]) });
  const allSolid = (ids: Iterable<string>, level: Level = 'solid') => new Map<string, Level>(Array.from(ids, (id) => [id, level]));
  const ctx = (goal: PassageContext['goal'], states: PassageContext['states'] = new Map()): PassageContext => ({ goal, states });
  const johnIdeas = [...new Set(john.flatMap((l) => l.ideas))];

  it('offers the first passage once its ideas are frontier or solid, and the next after it is passed', () => {
    const levels = allSolid(johnIdeas);
    levels.set('tense-perfect', 'frontier');
    const first = learnNext(neededOf(johnIdeas), ladder, levels, ctx({ book: '1jn' }));
    expect(first?.passage?.key).toBe('passage:1jn.1.1-4');
    expect(first?.lesson?.level.title).toBe('Reading the letters of John');
    const passed = new Map([['passage:1jn.1.1-4', { key: 'passage:1jn.1.1-4', state: 'passed' as const, when: 1, score: 1 }]]);
    expect(learnNext(neededOf(johnIdeas), ladder, levels, ctx({ book: '1jn' }, passed))?.passage?.key).toBe('passage:1jn.1.5-10');
  });

  it('names an idea of the lesson instead while it is not yet', () => {
    const levels = allSolid(johnIdeas);
    levels.delete('pronoun-relative');
    const next = learnNext(neededOf(johnIdeas), ladder, levels, ctx({ book: '1jn' }));
    expect(next?.passage).toBeUndefined();
    expect(next?.idea.id).toBe('pronoun-relative');
  });

  it('offers no passage with no goal, or a goal in another book, or the context left out', () => {
    const levels = allSolid(johnIdeas);
    expect(learnNext(neededOf(johnIdeas), ladder, levels, ctx(undefined))).toBeUndefined();
    expect(learnNext(neededOf(johnIdeas), ladder, levels, ctx({ book: 'rom' }))).toBeUndefined();
    expect(learnNext(neededOf(johnIdeas), ladder, levels)).toBeUndefined();
  });

  it('offers only the goal chapter’s lessons', () => {
    const levels = allSolid(johnIdeas);
    expect(learnNext(neededOf(johnIdeas), ladder, levels, ctx({ book: '1jn', chapter: 2 }))?.passage?.key).toBe('passage:1jn.2.1-11');
    const passed = new Map(
      ['passage:1jn.2.1-11', 'passage:1jn.2.12-17', 'passage:1jn.2.18-29'].map((key) => [key, { key, state: 'passed' as const, when: 1, score: 1 }] as const),
    );
    expect(learnNext(neededOf(johnIdeas), ladder, levels, ctx({ book: '1jn', chapter: 2 }, passed))).toBeUndefined();
  });

  it('counts a passage that was only read as not passed', () => {
    const levels = allSolid(johnIdeas);
    const read = new Map([['passage:1jn.1.1-4', { key: 'passage:1jn.1.1-4', state: 'read' as const, when: 1, score: null }]]);
    expect(learnNext(neededOf(johnIdeas), ladder, levels, ctx({ book: '1jn' }, read))?.passage?.key).toBe('passage:1jn.1.1-4');
  });

  it('names the lesson in the tutor’s words: Read 1 John 1:1-4', () => {
    const levels = allSolid(johnIdeas);
    expect(nextLessonTitle(neededOf(johnIdeas), ladder, levels, ctx({ book: '1jn' }))).toBe('Read 1 John 1:1-4');
    expect(nextLessonTitle(undefined, ladder, new Map())).toBe('The Greek alphabet');
  });

  it('keeps the list to the ladder alone', () => {
    expect(APPROACHES).toEqual([ladder]);
  });
});

describe('the passage lessons kept on the phone', () => {
  beforeEach(async () => {
    await db.open();
    await db.passageLessons.clear();
    clearBus();
  });

  it('keeps a passage as read, then passed with its score, and never takes passed back to read', async () => {
    const heard: unknown[] = [];
    subscribe('passage-lesson-changed', (e) => heard.push(e));
    await markRead('passage:1jn.1.1-4', 10);
    expect((await listPassageLessons()).get('passage:1jn.1.1-4')).toEqual({ key: 'passage:1jn.1.1-4', state: 'read', when: 10, score: null });
    await markPassed('passage:1jn.1.1-4', 0.9, 20);
    expect((await listPassageLessons()).get('passage:1jn.1.1-4')).toEqual({ key: 'passage:1jn.1.1-4', state: 'passed', when: 20, score: 0.9 });
    await markRead('passage:1jn.1.1-4', 30);
    expect((await listPassageLessons()).get('passage:1jn.1.1-4')?.state).toBe('passed');
    expect(heard).toEqual([
      { kind: 'passage-lesson-changed', key: 'passage:1jn.1.1-4', state: 'read' },
      { kind: 'passage-lesson-changed', key: 'passage:1jn.1.1-4', state: 'passed' },
    ]);
  });
});

describe('the upgrade from version 22', () => {
  it('adds the passageLessons table and keeps his grammar levels, reviews and words', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(22).stores({
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
    });
    await old.open();
    const level = { id: 'case-genitive', level: 'frontier', since: 5, how: 'sheet' };
    const review = { kind: 'grammar', id: 'case-genitive', step: 2, due: 9, lastWhen: 4, lapses: 0, rights: 3 };
    await old.table('grammarLevels').put(level);
    await old.table('reviews').put(review);
    old.close();

    await db.open();
    expect(db.verno).toBe(28);
    expect(await db.grammarLevels.toArray()).toEqual([level]);
    expect(await db.reviews.toArray()).toEqual([review]);
    expect(await db.passageLessons.count()).toBe(0);
    await markPassed('passage:1jn.1.1-4', 1, 5);
    expect(await db.passageLessons.count()).toBe(1);
  });
});
