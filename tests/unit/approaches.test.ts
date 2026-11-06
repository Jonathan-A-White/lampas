// The grammar approaches (src/approaches/, mw-hqd5bz.5): data, one file each; orderOf is the sequence a story follows.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPROACHES, DEFAULT_APPROACH, DEFAULT_HEBREW_APPROACH, HEBREW_APPROACHES, approachFor, approachOf, lessonOf, nextLessonOf, orderOf, stepsOf } from '../../src/approaches';
import { bmaTutor } from '../../src/approaches/bma-tutor';
import { hebrewLadder } from '../../src/approaches/hebrew-ladder';
import { ladder } from '../../src/approaches/ladder';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import { parseGoal } from '../../src/data/goal';
import { learnNext, nextLesson } from '../../src/data/grammar/goalProgress';
import { HEBREW_LADDER, HEBREW_PASSAGE_LESSONS } from '../../src/data/grammar/hebrew/ladder';
import { LADDER } from '../../src/data/grammar/ladder';
import { passageNeeds, type Level } from '../../src/data/grammar/needs';

const IDS = LADDER.map((i) => i.id);
const lessonsOf = (a: { stages: { levels: { lessons: unknown[] }[] }[] }) => a.stages.flatMap((s) => s.levels.flatMap((l) => l.lessons));

describe('the list', () => {
  it('lists one path, the Lampas ladder, and it is the default (tests/unit/one-path.test.ts)', () => {
    expect(APPROACHES.map((a) => a.id)).toEqual(['ladder']);
    expect(APPROACHES.map((a) => a.name)).toEqual(['Lampas ladder']);
    expect(DEFAULT_APPROACH).toBe('ladder');
    expect(approachOf('ladder')).toBe(ladder);
    expect(approachOf('nope')).toBeUndefined();
  });

  it('gives each a method of under 120 words and a stage, level and lesson with a title', () => {
    for (const a of APPROACHES) {
      expect(a.method.trim().split(/\s+/).length).toBeLessThan(120);
      expect(a.stages.length).toBeGreaterThan(0);
      for (const s of a.stages) {
        expect(s.title).not.toBe('');
        for (const l of s.levels) {
          expect(l.title).not.toBe('');
          for (const lesson of l.lessons) expect(lesson.title).not.toBe('');
        }
      }
    }
  });
});

describe('orderOf', () => {
  it('lists every idea of the ladder exactly once, for the record of BMA Tutor and for the Lampas ladder', () => {
    for (const a of [bmaTutor, ladder]) {
      const order = orderOf(a);
      expect(order).toHaveLength(IDS.length);
      expect([...order].sort()).toEqual([...IDS].sort());
    }
  });

  it('puts the Lampas ladder in rung order', () => {
    expect(orderOf(ladder)).toEqual(IDS);
  });

  it('appends the ideas no lesson names, by rung', () => {
    const thin = { ...ladder, stages: [{ title: 's', levels: [{ title: 'l', lessons: [{ title: 'x', ideas: ['case-genitive', 'alphabet'] }] }] }] };
    const order = orderOf(thin);
    expect(order.slice(0, 2)).toEqual(['case-genitive', 'alphabet']);
    expect(order.slice(2)).toEqual(IDS.filter((id) => id !== 'case-genitive' && id !== 'alphabet'));
  });
});

describe('the record of BMA Tutor (src/approaches/bma-tutor.ts, not listed)', () => {
  it('names three stages; the first has six levels of twelve lessons', () => {
    expect(bmaTutor.stages).toHaveLength(3);
    expect(bmaTutor.stages[0].levels).toHaveLength(6);
    for (const l of bmaTutor.stages[0].levels) expect(l.lessons).toHaveLength(12);
  });

  it('has every lesson name at least one idea that exists', () => {
    for (const lesson of lessonsOf(bmaTutor) as { title: string; ideas: string[] }[]) {
      expect(lesson.ideas.length, lesson.title).toBeGreaterThan(0);
      for (const id of lesson.ideas) expect(IDS, `${lesson.title}: ${id}`).toContain(id);
    }
  });

  it('starts with the alphabet and teaches the aorist before the genitive', () => {
    const order = orderOf(bmaTutor);
    expect(order[0]).toBe('alphabet');
    expect(order.indexOf('tense-aorist')).toBeLessThan(order.indexOf('case-genitive'));
    expect(orderOf(ladder).indexOf('case-genitive')).toBeLessThan(orderOf(ladder).indexOf('tense-aorist'));
  });

  it('finds the lesson of the genitive', () => {
    const found = lessonOf(bmaTutor, 'case-genitive');
    expect(found?.lesson.ideas).toContain('case-genitive');
    expect(found?.level.lessons).toContain(found?.lesson);
    expect(lessonOf(bmaTutor, 'nope')).toBeUndefined();
  });

  it('credits Biblical Mastery Academy, and the Lampas ladder has no credit', () => {
    expect(bmaTutor.credit?.name).toBe('Biblical Mastery Academy');
    expect(bmaTutor.credit?.line).toBe("After the Greek Success Path of Biblical Mastery Academy; the lessons and drills here are Lampas's own.");
    expect(bmaTutor.credit?.url).toMatch(/^https:\/\//);
    expect(ladder.credit).toBeNull();
  });

  it("copies none of the course's distinctive phrases: they appear in the file only in the credit line", () => {
    const source = readFileSync('src/approaches/bma-tutor.ts', 'utf8');
    const rest = source.replace(bmaTutor.credit!.line, '');
    for (const phrase of ['Success Path', 'Acquisition', 'Greek Tutor', 'Mastery Membership']) expect(rest, phrase).not.toContain(phrase);
    const own = [bmaTutor.method, ...bmaTutor.stages.flatMap((s) => [s.title, ...s.levels.flatMap((l) => [l.title, ...l.lessons.map((x) => x.title)])])].join('\n');
    for (const phrase of ['Success Path', 'Acquisition']) expect(own, phrase).not.toContain(phrase);
  });
});

describe('nextLessonOf', () => {
  it('is the lesson that holds the earliest idea not yet solid or at the frontier', () => {
    expect(nextLessonOf(bmaTutor, () => undefined)?.lesson).toBe(lessonOf(bmaTutor, 'alphabet')?.lesson);
    const done = new Set(orderOf(bmaTutor).slice(0, 30));
    const next = nextLessonOf(bmaTutor, (id) => (done.has(id) ? 'solid' : id === orderOf(bmaTutor)[30] ? 'notYet' : undefined));
    expect(next?.lesson).toBe(lessonOf(bmaTutor, orderOf(bmaTutor)[30])?.lesson);
    expect(nextLessonOf(bmaTutor, () => 'frontier')).toBeUndefined();
  });
});

describe('nextLesson: the lesson Settings marks Next (mw-86e9r1.24)', () => {
  const loadChapter = async (book: string, n: number): Promise<Chapter> => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;

  it("with the goal 1 John 1:1 is the lesson learnNext returns: with no progress, then after 'Got it' on each of the first ten ideas", async () => {
    const needs = await passageNeeds(parseGoal('1 John 1:1', BOOK_INDEX)!, loadChapter, BOOK_INDEX);
    const levels = new Map<string, Level>();
    for (let step = 0; step <= 10; step += 1) {
      const next = learnNext(needs, ladder, levels);
      expect(nextLesson(needs, ladder, levels)?.lesson, `after ${step} ideas`).toBe(next?.lesson?.lesson);
      expect(next, `after ${step} ideas`).toBeDefined();
      levels.set(next!.idea.id, 'frontier');
    }
  });

  it('with no goal is the lesson of the earliest idea with no level or not yet', () => {
    expect(nextLesson(undefined, ladder, new Map())?.lesson).toBe(lessonOf(ladder, 'alphabet')?.lesson);
    const levels = new Map<string, Level>([['alphabet', 'frontier'], ['letter-alpha', 'solid']]);
    expect(nextLesson(undefined, ladder, levels)?.lesson).toBe(lessonOf(ladder, 'letter-beta')?.lesson);
  });
});

describe('the Hebrew ladder as an approach (src/approaches/hebrew-ladder.ts, mw-5r3p30.914)', () => {
  const HEBREW_IDS = HEBREW_LADDER.map((i) => i.id);
  const order = orderOf(hebrewLadder);

  it('is the one path that orders the Hebrew ladder, listed by approachFor and apart from the Greek list', () => {
    expect(HEBREW_APPROACHES).toEqual([hebrewLadder]);
    expect(approachFor('hbo')).toBe(hebrewLadder);
    expect(approachFor('hbo', 'ladder')).toBe(hebrewLadder);
    expect(approachFor('grc', 'ladder')).toBe(ladder);
    expect(approachFor('grc', 'bma-tutor')).toBe(ladder);
    expect(APPROACHES).not.toContain(hebrewLadder);
    expect(hebrewLadder.lang).toBe('hbo');
    expect(hebrewLadder.id).toBe(DEFAULT_HEBREW_APPROACH);
    expect(hebrewLadder.credit).toBeNull();
    expect(hebrewLadder.method.trim().split(/\s+/).length).toBeLessThan(120);
  });

  it('lists every Hebrew idea exactly once, in rung order, and no Greek idea', () => {
    expect(order).toEqual(HEBREW_IDS);
  });

  it('names only ideas the Hebrew ladder has, and puts no idea before one it needs', () => {
    for (const id of order) for (const need of HEBREW_LADDER.find((i) => i.id === id)!.needs) expect(order.indexOf(need), `${need} before ${id}`).toBeLessThan(order.indexOf(id));
  });

  it('starts with the alphabet, as the grammar he pinned does, and ends with word order', () => {
    expect(order[0]).toBe('he-alphabet');
    expect(order.at(-1)).toBe('he-word-order');
  });

  it('puts each Hebrew passage lesson right after the lesson of its last idea', () => {
    const steps = stepsOf(hebrewLadder);
    for (const lesson of HEBREW_PASSAGE_LESSONS) {
      const at = steps.findIndex((s) => s.kind === 'passage' && s.passage === lesson.passage);
      expect(at, lesson.title).toBeGreaterThan(0);
      const last = Math.max(...lesson.ideas.map((id) => order.indexOf(id)));
      expect(steps.slice(0, at).filter((s) => s.kind === 'idea')).toHaveLength(last + 1);
      expect(lessonOf(hebrewLadder, lesson.ideas[0])?.lesson.title).toBe(HEBREW_LADDER.find((i) => i.id === lesson.ideas[0])!.title);
    }
  });

  it('marks as Next the lesson of the earliest idea with no level, and Learn next reads the same approach', () => {
    expect(nextLesson(undefined, hebrewLadder, new Map())?.lesson.title).toBe('The Hebrew alphabet');
    const levels = new Map<string, Level>([['he-alphabet', 'solid']]);
    expect(nextLesson(undefined, hebrewLadder, levels)?.lesson.title).toBe('Alef');
    const needs = { ideas: HEBREW_LADDER.map((i) => ({ id: i.id, count: 0, example: { form: '', code: '', ref: '' } })) };
    expect(learnNext(needs, hebrewLadder, levels)?.lesson?.lesson.title).toBe('Alef');
    const solid = new Map(HEBREW_IDS.map((id): [string, Level] => [id, 'solid']));
    expect(learnNext(needs, hebrewLadder, solid)?.passage?.label).toBe('Jonah 1:1-3');
    expect(learnNext(needs, hebrewLadder, solid, { goal: undefined, states: new Map([['passage:jon.1.1-3', { state: 'passed' as const }]]) })).toBeUndefined();
  });

  it('offers the Jonah passage once its ideas are at least frontier, and not again once it is passed', () => {
    const needs = { ideas: HEBREW_LADDER.map((i) => ({ id: i.id, count: 0, example: { form: '', code: '', ref: '' } })) };
    const lesson = HEBREW_PASSAGE_LESSONS[0];
    const levels = new Map<string, Level>(HEBREW_IDS.slice(0, order.indexOf(lesson.ideas.at(-1)!) + 1).map((id): [string, Level] => [id, 'frontier']));
    for (const id of lesson.ideas) levels.set(id, 'frontier');
    const next = learnNext(needs, hebrewLadder, levels, { goal: undefined, states: new Map() });
    expect(next?.passage?.label).toBe('Jonah 1:1-3');
    const passed = new Map([[next!.passage!.key, { state: 'passed' as const }]]);
    expect(learnNext(needs, hebrewLadder, levels, { goal: undefined, states: passed })?.passage).toBeUndefined();
  });
});
