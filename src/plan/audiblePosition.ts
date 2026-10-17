// src/plan/audiblePosition.ts — where a screenshot of Audible says she got to (mw-umv8sp.4). The screenshot goes to the mill's audible-position grind
// (grinds/audible-position.json: sonnet, low effort, one picture), cut down on the phone as a talk's pictures are (src/talk/pictures.ts), with the chapter she set off
// from. What comes back is {book (OSIS), chapter, position, confidence}. The answer is not believed: its book must be one of the Bible's 66 by its OSIS code and its
// chapter one the book has, or nothing is proposed.
import { BOOKS } from '../data/books';
import { OT_BOOKS } from '../data/otBooks';
import type { PlanChapter } from '../data/plans';
import { OSIS, OT_OSIS } from '../nav/links';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind } from '../services/tutor';
import { filesOf, preparePicture } from '../talk/pictures';
import { chapterName } from './chapterName';

export const AUDIBLE_POSITION_KIND = 'audible-position';

export type Confidence = 'high' | 'medium' | 'low';

/** The grist's answer (grinds/audible-position.answer.schema.json). */
export interface AudiblePositionAnswer {
  book: string | null;
  chapter: number | null;
  position: string | null;
  confidence: Confidence;
}

/** What the screenshot was read as: a chapter of the Bible, the time played into it as the screen printed it (or null), and how sure the reading is. */
export interface ScreenshotReading {
  chapter: PlanChapter;
  position: string | null;
  confidence: Confidence;
}

/** What the grist is sent beside the picture (Audible Position Request 1): the app's language and the chapter she set off from, by name. */
export const buildAudiblePositionRequest = (setOffFrom: PlanChapter): { language: string; set_off_from: string } => ({
  language: 'en',
  set_off_from: chapterName(setOffFrom),
});

const CONFIDENCES: readonly string[] = ['high', 'medium', 'low'];
const nullOr = (value: unknown, kind: 'string' | 'number'): boolean => value === null || typeof value === kind;

/** The app's own check of an answer, run before it is believed. */
export function isAudiblePositionAnswer(value: unknown): value is AudiblePositionAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const { book, chapter, position, confidence } = value as Record<string, unknown>;
  return nullOr(book, 'string') && nullOr(chapter, 'number') && nullOr(position, 'string') && typeof confidence === 'string' && CONFIDENCES.includes(confidence);
}

/** OSIS code, lower-cased -> the book's code and its number of chapters, for both testaments. */
const BY_OSIS = new Map(
  [...OT_BOOKS, ...BOOKS].map((b) => [(OSIS[b.code] ?? OT_OSIS[b.code] ?? b.code).toLowerCase(), { code: b.code, chapters: b.chapters }] as const),
);

/** The reading the answer gives, or null when it names no chapter Lampas can place: a book that is not one of the Bible's, or a chapter the book does not have. */
export function checkedReading(answer: AudiblePositionAnswer): ScreenshotReading | null {
  const book = answer.book === null ? undefined : BY_OSIS.get(answer.book.trim().toLowerCase());
  const { chapter } = answer;
  if (!book || chapter === null || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;
  const position = answer.position?.trim() || null;
  return { chapter: { code: book.code, chapter }, position, confidence: answer.confidence };
}

/** How sure the reading is, in words. */
export const CONFIDENCE_WORDS: Readonly<Record<Confidence, string>> = {
  high: 'I am sure of it.',
  medium: 'I think so, but check it.',
  low: 'I am not sure: check it before you tap Yes.',
};

/** What the screenshot shows, or null when it shows no chapter Lampas can place. Throws a TutorError whatever went wrong. */
export async function readAudibleScreenshot(picture: File, setOffFrom: PlanChapter, signal?: AbortSignal): Promise<ScreenshotReading | null> {
  const sent = await preparePicture(picture, 0);
  const answer = await askGrind(AUDIBLE_POSITION_KIND, buildAudiblePositionRequest(setOffFrom), isAudiblePositionAnswer, {
    key: getDeviceKeyBytes(),
    files: filesOf([sent]),
    signal,
    untimed: true,
  });
  return checkedReading(answer);
}
