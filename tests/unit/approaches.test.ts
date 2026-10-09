// The grammar approaches (src/approaches/, mw-hqd5bz.5): data, one file each; orderOf is the sequence a story follows.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPROACHES, DEFAULT_APPROACH, approachOf, lessonOf, nextLessonOf, orderOf } from '../../src/approaches';
import { bmaTutor } from '../../src/approaches/bma-tutor';
import { ladder } from '../../src/approaches/ladder';
import { LADDER } from '../../src/data/grammar/ladder';

const IDS = LADDER.map((i) => i.id);
const lessonsOf = (a: { stages: { levels: { lessons: unknown[] }[] }[] }) => a.stages.flatMap((s) => s.levels.flatMap((l) => l.lessons));

describe('the list', () => {
  it('has BMA Tutor first, then the Lampas ladder, with distinct ids; BMA Tutor is the default', () => {
    expect(APPROACHES.map((a) => a.id)).toEqual(['bma-tutor', 'ladder']);
    expect(APPROACHES.map((a) => a.name)).toEqual(['BMA Tutor', 'Lampas ladder']);
    expect(DEFAULT_APPROACH).toBe('bma-tutor');
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
  it('lists every idea of the ladder exactly once, for BMA Tutor and for the Lampas ladder', () => {
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

describe('BMA Tutor', () => {
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
