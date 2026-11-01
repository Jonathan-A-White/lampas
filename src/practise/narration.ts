// src/practise/narration.ts — Narration, the second door of the Verse view's Practise (mw-5r3p30.901, his grilling mw-6ww.146): Susan Wise Bauer's narration is telling a passage back in
// your own words, aloud, and the parent writes it down. He holds the bar and tells the verse or passage back (the phone's dictation, en-US: narration is in English), the app writes down
// what the phone heard, and the narration grind (grinds/narration.json: sonnet, no picture) lists the points he caught in the passage's order, the points he missed, and one gentle
// question that leads to the first of them. This file is the pure part: the written-down text, the request, and the check of the answer. The screen is NarrationPane.tsx.

export const NARRATION_KIND = 'narration';

/** The most characters of a passage the grind takes (its input schema's maxLength): a verse is far under it, a long passage is said to be too long. */
export const MAX_PASSAGE_CHARS = 8000;
/** The most characters of a narration (the same). */
export const MAX_NARRATION_CHARS = 3000;

/** What the phone heard, written down as a parent would: the spaces collapsed, a capital letter to begin and a full stop to end unless it ends in one already. '' for nothing heard. */
export function writtenDown(heard: string): string {
  const text = heard.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const capital = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?…]["'”’)]*$/.test(capital) ? capital : `${capital}.`;
}

/** The request the narration grind is sent (grinds/narration.input.schema.json). */
export interface NarrationRequest {
  reference: string;
  /** the verse or passage in English, as the translation has it */
  passage: string;
  /** what he told back, written down */
  narration: string;
}

export const buildNarrationRequest = (reference: string, passage: string, heard: string): NarrationRequest => ({ reference, passage, narration: writtenDown(heard) });

/** Why this passage or narration cannot be asked about, in words for him; null when it can. */
export function narrationRefusal(passage: string, narration: string): string | null {
  if (passage.length > MAX_PASSAGE_CHARS) return 'That is a long passage to tell back. Open a verse or a shorter passage to practise narration.';
  if (narration.length > MAX_NARRATION_CHARS) return 'That was a long narration for the tutor to read. Tell back a smaller part.';
  return null;
}

/** The grind's answer (grinds/narration.answer.schema.json). */
export interface NarrationAnswer {
  /** the points of the passage he told, in the passage's order */
  caught: string[];
  /** the points of the passage he left out, in the passage's order */
  missed: string[];
  /** he told what he caught in the order the passage has them */
  in_order: boolean;
  /** one gentle question that leads him to the first thing missed (or deeper, when nothing was) */
  question: string;
}

const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);

/** The app's own check of an answer, run before it is believed. */
export function isNarrationAnswer(value: unknown): value is NarrationAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const { caught, missed, in_order, question } = value as Partial<Record<keyof NarrationAnswer, unknown>>;
  return isStrings(caught) && isStrings(missed) && typeof in_order === 'boolean' && typeof question === 'string' && question.length > 0;
}

/** What the Practise state keeps of a narration (practiceState.ts): what he told, written down, and the tutor's answer once it has come (null while it is on its way or when it could not be had). */
export interface Narrated {
  text: string;
  answer: NarrationAnswer | null;
}
