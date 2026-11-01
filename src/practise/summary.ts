// src/practise/summary.ts — Summary, the fourth door of the Verse view's Practise (mw-5r3p30.902, his grilling mw-6ww.146): Susan Wise Bauer's summarization is giving only the main points of a passage in a few
// sentences. He types them, or photographs his handwriting, and the summary grind (grinds/summary.json: sonnet, one optional picture) lists the main points present and missing in the passage's order, says whether
// he gave them in that order and whether the length is right, and gives one sentence of a model summary to compare. This file is the pure part: the typed text, the request, and the check of the answer.
// The screen is SummaryPane.tsx. Summary is in English only in this slice.

export const SUMMARY_KIND = 'summary';

/** The most characters of a passage the grind takes (its input schema's maxLength): a verse, a passage and a whole chapter are far under it (Psalm 119 is about 9,000), a book is said to be too long. */
export const MAX_SUMMARY_PASSAGE_CHARS = 20000;
/** The most characters of a typed summary (the same). */
export const MAX_SUMMARY_CHARS = 3000;

/** What he typed, as the tutor is sent it: the spaces and lines collapsed to single spaces and the ends trimmed; his words and punctuation are his own. '' for nothing typed. */
export const typedSummary = (typed: string): string => typed.replace(/\s+/g, ' ').trim();

/** How the summary reaches the tutor: as the text he typed, or as a picture of his handwriting. */
export type SummaryHow = 'typed' | 'photo';

/** The request the summary grind is sent (grinds/summary.input.schema.json): a photo carries no `summary`, the picture is it. */
export interface SummaryRequest {
  reference: string;
  /** the verse, passage or chapter in English, as the translation has it */
  passage: string;
  how: SummaryHow;
  summary?: string;
}

export const buildSummaryRequest = (reference: string, passage: string, given: { how: 'typed'; text: string } | { how: 'photo' }): SummaryRequest =>
  given.how === 'typed' ? { reference, passage, how: 'typed', summary: typedSummary(given.text) } : { reference, passage, how: 'photo' };

/** Why this passage or summary cannot be asked about, in words for him; null when it can. */
export function summaryRefusal(passage: string, summary: string): string | null {
  if (passage.length > MAX_SUMMARY_PASSAGE_CHARS) return 'That is a long passage to summarise. Open a chapter, a shorter passage or a verse to practise summary.';
  if (summary.length > MAX_SUMMARY_CHARS) return 'That summary is too long for the tutor to read. A summary is only the main points: shorten it.';
  return null;
}

export type SummaryLength = 'too_short' | 'right' | 'too_long';
export const SUMMARY_LENGTHS: readonly SummaryLength[] = ['too_short', 'right', 'too_long'];

/** The grind's answer (grinds/summary.answer.schema.json). */
export interface SummaryAnswer {
  /** false when a photographed page could not be read: nothing else is judged */
  readable: boolean;
  /** his summary as the tutor read it from the page ('' for a typed one or an unreadable page) */
  read_as: string;
  /** the passage's main points he gave, in the passage's order */
  present: string[];
  /** the passage's main points he left out, in the passage's order */
  missing: string[];
  /** he gave the points in the order the passage has them */
  in_order: boolean;
  length: SummaryLength;
  /** one sentence of a model summary of the passage, to compare ('' only when the page could not be read) */
  model_summary: string;
  /** one plain sentence on what to do next (for an unreadable page, how to photograph it) */
  advice: string;
}

const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);

/** The app's own check of an answer, run before it is believed. */
export function isSummaryAnswer(value: unknown): value is SummaryAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const { readable, read_as, present, missing, in_order, length, model_summary, advice } = value as Partial<Record<keyof SummaryAnswer, unknown>>;
  return (
    typeof readable === 'boolean' &&
    typeof read_as === 'string' &&
    isStrings(present) &&
    isStrings(missing) &&
    typeof in_order === 'boolean' &&
    SUMMARY_LENGTHS.includes(length as SummaryLength) &&
    typeof model_summary === 'string' &&
    (!readable || model_summary.length > 0) &&
    typeof advice === 'string'
  );
}

/** What the Practise state keeps of a summary (practiceState.ts): the text as he wrote it or the tutor read it, how it came, and the tutor's answer once it has come (null while it is on its way or when it could not be had). */
export interface Summarised {
  how: SummaryHow;
  text: string;
  answer: SummaryAnswer | null;
}
