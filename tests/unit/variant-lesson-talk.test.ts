// What the tutor is told on a lesson on variant readings (mw-9ji6ek0.18, src/tutor/variantLessonTalk.ts, as lessonTalk.ts): the screen is the lesson, with its id, its title and the page's text,
// kept under a key of its own for each lesson; the lessons' list reports the five titles. Both fit the limits of the screen the mill takes (src/tutor/screen.ts).
import { describe, expect, it } from 'vitest';
import { VARIANT_LESSONS } from '../../src/lessons/variants';
import { fitScreen, FACT_VALUE_MAX, MAX_FACTS, SCREEN_NAMES, suggestionsFor } from '../../src/tutor/screen';
import { variantLessonKept, variantLessonListScreen, variantLessonScreen } from '../../src/tutor/variantLessonTalk';

const THIRD = VARIANT_LESSONS[2];
const fact = (screen: { facts: { label: string; value: string }[] }, label: string) => screen.facts.find((f) => f.label === label)?.value;

/** The page up to its Sources, without its headings and the marks of Markdown, on one line. */
const bodyOf = (markdown: string): string =>
  markdown.split('\n## Sources')[0].replace(/^#+ .*$/gm, '').replace(/\*\*|\*/g, '').replace(/\s+/g, ' ').trim();

describe('the screen of a lesson on variant readings', () => {
  it('is named as the lessons screen is, and carries the lesson, its id, its place in the five and its title', () => {
    const screen = variantLessonScreen(THIRD);
    expect(screen.name).toBe(SCREEN_NAMES.lessons);
    expect(SCREEN_NAMES.lessons).toBe('Lessons on variant readings');
    expect(fact(screen, 'Lesson')).toBe('Byzantine, Nestle-Aland and ECM');
    expect(fact(screen, 'Lesson id')).toBe('byzantine-na-ecm');
    expect(fact(screen, 'Page')).toBe('3 of 5');
  });

  it('is kept under a key of its own for each lesson, so one lesson’s talk is never another’s', () => {
    const keys = VARIANT_LESSONS.map((l) => variantLessonKept(l.id));
    expect(new Set(keys).size).toBe(5);
    expect(variantLessonScreen(THIRD).kept).toBe(variantLessonKept(THIRD.id));
    expect(variantLessonKept(THIRD.id)).toBe('screen.variant-lesson.byzantine-na-ecm');
  });

  it('holds the text of the page, in order, in facts the mill takes whole', () => {
    for (const lesson of VARIANT_LESSONS) {
      const screen = variantLessonScreen(lesson);
      expect(fitScreen(screen).facts, `${lesson.title}: nothing is cut or dropped by the limits`).toEqual(screen.facts);
      expect(screen.facts.length).toBeLessThanOrEqual(MAX_FACTS);
      for (const f of screen.facts) expect(f.value.length).toBeLessThanOrEqual(FACT_VALUE_MAX);
      const text = screen.facts.filter((f) => f.label.startsWith('Text ')).map((f) => f.value).join(' ');
      expect(text.startsWith(bodyOf(lesson.markdown).slice(0, 60)), `${lesson.title}: the text begins where the page does`).toBe(true);
      expect(text, `${lesson.title}: the Sources’ links are not sent as text`).not.toContain('https://');
    }
  });

  it('says so when the text sent is not all of the page', () => {
    for (const lesson of VARIANT_LESSONS) {
      const screen = variantLessonScreen(lesson);
      const text = screen.facts.filter((f) => f.label.startsWith('Text ')).map((f) => f.value).join(' ');
      const whole = text === bodyOf(lesson.markdown).replace(/\s+/g, ' ');
      expect(screen.facts.some((f) => f.label === 'Text cut'), `${lesson.title}: a cut is told`).toBe(!whole);
    }
  });
});

describe('the screen of the lessons’ list', () => {
  it('names the five lessons, in order', () => {
    const screen = variantLessonListScreen(VARIANT_LESSONS);
    expect(screen.name).toBe(SCREEN_NAMES.lessons);
    expect(screen.kept).toBeUndefined();
    expect(screen.facts.filter((f) => /^Lesson \d$/.test(f.label)).map((f) => f.value)).toEqual(VARIANT_LESSONS.map((l) => l.title));
  });

  it('has questions to open with', () => {
    expect(suggestionsFor(SCREEN_NAMES.lessons).length).toBeGreaterThanOrEqual(2);
  });
});
