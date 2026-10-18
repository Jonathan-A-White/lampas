// src/hardSounds/lessons.ts — the Hard sounds lessons (mw-5r3p30.361): every data file of src/data/hardSounds/, checked by its schema, and the accessors the
// Goal screen's section, a letter sheet and the lesson screen read them through. A lesson is written for one or more English accents; IPA reads the American
// ones, as the course 'Learn the IPA sounds' does (src/ipa/course.ts courseAccent). A file that fails the check is left out and named in the console (the
// unit test tests/unit/hard-sounds-engine.test.tsx fails on it first).
import { lessonProblems, type HardSoundLesson, type Said } from '../data/hardSounds/schema';
import { AMERICAN_ID, type EnglishAccent } from '../speech/accents';

const FILES = import.meta.glob<unknown>('../data/hardSounds/*.json', { eager: true, import: 'default' });

/** Every lesson that passes the check, by title. */
export const LESSONS: readonly HardSoundLesson[] = Object.entries(FILES)
  .filter(([file, raw]) => {
    const problems = lessonProblems(raw);
    if (problems.length) console.error(`Hard sounds: ${file} is left out:\n${problems.join('\n')}`);
    return problems.length === 0;
  })
  .map(([, raw]) => raw as HardSoundLesson)
  .sort((a, b) => a.title.localeCompare(b.title));

/** The accent a lesson is read in for a reader of `accent`: his own, or American's when he chose IPA. */
export const lessonAccent = (accent: EnglishAccent): string => (accent.id === 'ipa' ? AMERICAN_ID : accent.id);

/** The lessons of the pronunciation `schemeId` written for a reader of `accent`. */
export const lessonsFor = (schemeId: string, accent: EnglishAccent, lessons: readonly HardSoundLesson[] = LESSONS): HardSoundLesson[] =>
  lessons.filter((l) => l.scheme === schemeId && l.for.includes(lessonAccent(accent)));

/** Of those, the ones that teach `letter` (a letter's small form, or a pair as it is written): what its sheet links to. */
export const lessonsForLetter = (letter: string, schemeId: string, accent: EnglishAccent, lessons: readonly HardSoundLesson[] = LESSONS): HardSoundLesson[] =>
  lessonsFor(schemeId, accent, lessons).filter((l) => l.letters.includes(letter));

export const lessonById = (id: string | undefined, lessons: readonly HardSoundLesson[] = LESSONS): HardSoundLesson | undefined => lessons.find((l) => l.id === id);

/** What a step says to a reader of `accent`. */
export const saidFor = (said: Said, accent: EnglishAccent): string => (typeof said === 'string' ? said : (said[lessonAccent(accent)] ?? ''));
