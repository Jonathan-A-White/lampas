// src/tutor/variantLessonTalk.ts — what the tutor is told on a lesson on variant readings (mw-9ji6ek0.18), as lessonTalk.ts tells it on a grammar lesson: the screen is the lesson, with its
// id, its title, its place in the five and the page's text. The page's Ask the tutor opens the round control's sheet on that screen (src/tutor/askNow.ts), kept under a key of its own for each
// lesson. Pure: src/lessons/VariantLessons.tsx calls it. The text goes in facts of at most FACT_VALUE_MAX characters (src/tutor/screen.ts) and the Sources' links stay out.
import type { VariantLesson } from '../lessons/variants';
import { FACT_VALUE_MAX, MAX_FACTS, SCREEN_NAMES, type ScreenContext, type ScreenFact } from './screen';

/** The key a lesson's talk is kept under: one for each lesson, so a lesson's talk is never another's. */
export const variantLessonKept = (id: string): string => `screen.variant-lesson.${id}`;

/** What a lesson's screen reads of a lesson. */
type LessonOf = Pick<VariantLesson, 'id' | 'title' | 'order' | 'markdown'>;

/** The page as plain sentences up to its Sources: no headings, no marks, no link addresses, one line. */
function plainBody(markdown: string): string {
  return markdown
    .split(/\n## Sources\b/)[0]
    .replace(/^#+ .*$/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The text in pieces of at most `max` characters, each ending at a space; a word longer than `max` is cut. */
function pieces(text: string, max: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const at = rest.lastIndexOf(' ', max);
    const cut = at > 0 ? at : max;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * The screen a lesson reports. `lessons` is how many there are (five), for 'Page 3 of 5'. The text is cut in pieces under 'Text 1', 'Text 2' ...; if the page is longer than the facts have room for,
 * the last fact is 'Text cut' and says the rest is on the page, so the tutor never answers as if it had read what it was not sent.
 */
export function variantLessonScreen(lesson: LessonOf, lessons = 5): ScreenContext {
  const head: ScreenFact[] = [
    { label: 'Lesson', value: lesson.title },
    { label: 'Lesson id', value: lesson.id },
    { label: 'Page', value: `${lesson.order} of ${lessons}` },
  ];
  const all = pieces(plainBody(lesson.markdown), FACT_VALUE_MAX);
  const room = MAX_FACTS - head.length;
  const fits = all.length <= room;
  const shown = fits ? all : all.slice(0, room - 1);
  const facts: ScreenFact[] = [
    ...head,
    ...shown.map((value, i) => ({ label: `Text ${i + 1}`, value })),
    ...(fits ? [] : [{ label: 'Text cut', value: 'The page goes on past this text; the rest is on the page, not sent.' }]),
  ];
  return { name: SCREEN_NAMES.lessons, facts, kept: variantLessonKept(lesson.id) };
}

/** The screen the lessons' list reports: the five titles in order. */
export function variantLessonListScreen(lessons: readonly Pick<VariantLesson, 'title' | 'order'>[]): ScreenContext {
  return {
    name: SCREEN_NAMES.lessons,
    facts: [
      { label: 'Page', value: 'the list of the five lessons on variant readings' },
      ...lessons.map((l) => ({ label: `Lesson ${l.order}`, value: l.title })),
    ],
  };
}
