// src/services/feedback.ts — feedback to the factory: a grist of the kind 'feedback' (grinds/feedback.json) with the app's version,
// his words, who to credit and up to four pictures attached. The wire work is src/services/tutor.ts's askGrind; the mill's answer
// is only {received: true}. What the factory does with it is Postern's.
import { grist } from 'bsv-kit/grist';
import { askGrind, TutorError, type AskOptions } from './tutor';

export const FEEDBACK_KIND = 'feedback';

/** The limits of the input schema (grinds/feedback.input.schema.json). */
export const MAX_FEEDBACK_CHARS = 1200;
export const MAX_CREDIT_NAME = 120;
export const MAX_CREDIT_URL = 300;

/** The most pictures one request carries: bsv-kit's cap on the files of one grist. */
export const MAX_PICTURES = grist.MAX_PHOTOS;

/** What the grind is sent (Feedback Request 1). */
export interface FeedbackRequest {
  kind: 'grammar-approach';
  text: string;
  credit: { name: string; url?: string };
  app_version: string;
}

/** What the grind answers (grinds/feedback.answer.schema.json). */
export interface FeedbackAnswer {
  received: boolean;
  note?: string;
}

/** A link as he typed it, with https:// put in front when he left the scheme off; '' for none. */
export function linkOf(typed: string): string {
  const link = typed.trim();
  if (!link) return '';
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function buildFeedbackRequest(text: string, creditName: string, creditUrl = ''): FeedbackRequest {
  const url = linkOf(creditUrl);
  return {
    kind: 'grammar-approach',
    text: text.trim(),
    credit: url ? { name: creditName.trim(), url } : { name: creditName.trim() },
    app_version: __APP_VERSION__,
  };
}

/** The app's own check of an answer, run before it is believed (the schema's limits). */
export function isFeedbackAnswer(value: unknown): value is FeedbackAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const answer = value as Record<string, unknown>;
  const keys = Object.keys(answer);
  if (typeof answer.received !== 'boolean' || keys.some((k) => k !== 'received' && k !== 'note')) return false;
  return answer.note === undefined || (typeof answer.note === 'string' && answer.note.length > 0 && answer.note.length <= 200);
}

/** Sends the feedback with its pictures (JPEG files, at most MAX_PICTURES) and waits for the mill's receipt. Throws a TutorError. */
export async function sendFeedback(request: FeedbackRequest, files: grist.GristFile[], options: AskOptions): Promise<FeedbackAnswer> {
  const answer = await askGrind(FEEDBACK_KIND, request, isFeedbackAnswer, { ...options, files });
  if (!answer.received) throw new TutorError('no-answer', answer.note ? `The factory did not take it: ${answer.note}` : 'The factory did not take it.');
  return answer;
}
