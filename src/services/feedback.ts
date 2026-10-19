// src/services/feedback.ts — feedback to the factory: a grist of the kind 'feedback' (grinds/feedback.json) with the app's version,
// his words and, for a grammar approach, who to credit and up to four pictures attached; or, for an ask the tutor could not meet, the
// tutor's one-line summary and the screen he asked from; or, for a grammar book of his Logos library, the title he typed; or, for a devotional (Settings > Daily > Request a devotional), its title; or, for an ask of Settings >
// Ask for more (an approach or programme, a study resource, a text, a translation), what he wants, why and a link. This is the ONE sender:
// Ask for another approach, Ask for another book, the Ask for more forms and the tutor's 'Send this to the makers' all call submitFeedback (tests/unit/feedback-shared.test.ts keeps it so). The wire work is src/services/tutor.ts's askGrind. The grind forwards
// ("forward": "mayor"): no model reads it, the mill mails it to the Mayor with the pictures and answers {"status":"sent"}.
import { publish } from '../events/bus';
import { keepRequest } from '../data/repositories/requests';
import { getDeviceKeyBytes } from './deviceKey';
import { MILL_MAX_FILES, type MillFile } from './mill';
import { askGrind, TutorError, type AskOptions } from './tutor';

export const FEEDBACK_KIND = 'feedback';

/** The limits of the input schema (grinds/feedback.input.schema.json). */
export const MAX_FEEDBACK_CHARS = 1200;
export const MAX_CREDIT_NAME = 120;
export const MAX_CREDIT_URL = 300;

/** The most pictures one request carries: bsv-kit's cap on the files of one grist. */
export const MAX_PICTURES = MILL_MAX_FILES;

/** The limits of a tutor-ask request (the input schema's second branch): the tutor's summary, the screen's name, the talk's reference. */
export const MAX_SUMMARY = 200;
export const MAX_SCREEN_NAME = 40;
export const MAX_REFERENCE = 80;

/** What the grind is sent when he asks for another grammar approach (Feedback Request 1). */
export interface GrammarApproachRequest {
  kind: 'grammar-approach';
  text: string;
  credit: { name: string; url?: string };
  app_version: string;
}

/** One thing the screen showed, as the tutor was told it (src/tutor/screen.ts ScreenFact). */
export interface FeedbackFact {
  label: string;
  value: string;
}

/** What the grind is sent when the tutor offered an ask it cannot meet and he tapped Send this to the makers: his words, the tutor's
 * one-line summary, the screen he asked from ('Reader' for a talk about the text), the talk's reference and what the screen showed. */
export interface TutorAskRequest {
  kind: 'tutor-ask';
  text: string;
  summary: string;
  screen: string;
  reference: string;
  facts?: FeedbackFact[];
  app_version: string;
}

/** The most a grammar book's title (and author) may be: the input schema's third branch. */
export const MAX_BOOK_CHARS = 200;

/** What the grind is sent when he asks for another grammar book of his Logos library (Settings > Grammar books > Ask for another book). */
export interface GrammarBookRequest {
  kind: 'grammar-book';
  text: string;
  app_version: string;
}

/** The kinds of ask on Settings > Ask for more, each a short form (the input schema's fourth branch): an approach or programme, a study resource, a text, a translation. */
export const MORE_KINDS = ['approach', 'study-resource', 'text', 'translation'] as const;
export type MoreKind = (typeof MORE_KINDS)[number];

/** The most the name of what he asks for may be. */
export const MAX_MORE_NAME = 120;

/** What the grind is sent from an Ask for more form: what he wants by name, why (when he said), and a link (when he gave one). */
export interface MoreRequest {
  kind: MoreKind;
  name: string;
  text?: string;
  url?: string;
  app_version: string;
}

/** What the grind is sent when he asks for a devotional of his Logos library (Settings > Daily > Request a devotional): its title as he typed it. The Mayor adds
 * it to src/data/daily/devotionals.ts when he finds its Logos id. It is the fourth branch's shape, so the title is the name's limit. */
export interface DevotionalRequest {
  kind: 'devotional';
  name: string;
  text?: undefined;
  app_version: string;
}

export type FeedbackRequest = GrammarApproachRequest | TutorAskRequest | GrammarBookRequest | MoreRequest | DevotionalRequest;

/** The kinds of feedback; the bus announces one when the mill has it. */
export type FeedbackKind = FeedbackRequest['kind'];

/** What the mill answers a forwarded grist: it has mailed it to the Mayor. */
export interface FeedbackAnswer {
  status: 'sent';
}

/** A link as he typed it, with https:// put in front when he left the scheme off; '' for none. */
export function linkOf(typed: string): string {
  const link = typed.trim();
  if (!link) return '';
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function buildFeedbackRequest(text: string, creditName: string, creditUrl = ''): GrammarApproachRequest {
  const url = linkOf(creditUrl);
  return {
    kind: 'grammar-approach',
    text: text.trim(),
    credit: url ? { name: creditName.trim(), url } : { name: creditName.trim() },
    app_version: __APP_VERSION__,
  };
}

/** The request for a grammar book: the title as he typed it, with the author if he gave one. */
export function buildBookRequest(title: string): GrammarBookRequest {
  return { kind: 'grammar-book', text: title.trim(), app_version: __APP_VERSION__ };
}

/** The request for a devotional: the title as he typed it, trimmed. */
export function buildDevotionalRequest(title: string): DevotionalRequest {
  return { kind: 'devotional', name: title.trim(), app_version: __APP_VERSION__ };
}

/** The request of an Ask for more form: the name trimmed; why and the link only when he wrote them (https:// put in front of a bare link). */
export function buildMoreRequest(kind: MoreKind, name: string, why = '', link = ''): MoreRequest {
  const text = why.trim();
  const url = linkOf(link);
  return { kind, name: name.trim(), ...(text ? { text } : {}), ...(url ? { url } : {}), app_version: __APP_VERSION__ };
}

/** The most a tutor-ask request may weigh, as JSON in UTF-8 (the same as a talk's, src/services/talk.ts MAX_REQUEST_BYTES): a grist's record
 * is capped at 10 KiB and the sealed grist is base64 of this. Greek is two bytes a letter, so the facts are what gives way. */
export const MAX_ASK_BYTES = 6500;

/** The request for an ask the tutor could not meet: his words, the tutor's summary, where he asked and what that screen showed. While it
 * is too big for a grist the screen's last facts are left out, one at a time; his words and the summary are never cut. */
export function buildTutorAskRequest(ask: { text: string; summary: string; screen: string; reference: string; facts?: FeedbackFact[] }): TutorAskRequest {
  const facts = [...(ask.facts ?? [])];
  const make = (): TutorAskRequest => ({
    kind: 'tutor-ask',
    text: ask.text.trim(),
    summary: ask.summary.trim(),
    screen: ask.screen.trim(),
    reference: ask.reference.trim(),
    ...(facts.length ? { facts } : {}),
    app_version: __APP_VERSION__,
  });
  while (facts.length > 0 && new TextEncoder().encode(JSON.stringify(make())).length > MAX_ASK_BYTES) facts.pop();
  return make();
}

/** The app's own check of an answer, run before it is believed: exactly the mill's {"status":"sent"}. */
export function isFeedbackAnswer(value: unknown): value is FeedbackAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const answer = value as Record<string, unknown>;
  return Object.keys(answer).length === 1 && answer.status === 'sent';
}

/** What the requests table keeps of a request: the tutor's summary for a tutor-ask, his words for a grammar approach or book, and for an
 * Ask for more form the name with why after it ('The ESV: To read it beside the Greek.'). */
function kept(request: FeedbackRequest, txid: string, sentAt: number): Parameters<typeof keepRequest>[0] {
  const what =
    request.kind === 'tutor-ask'
      ? { summary: request.summary }
      : 'name' in request
        ? { text: request.text ? `${request.name}: ${request.text}` : request.name }
        : { text: request.text };
  return { txid, kind: request.kind, ...what, app_version: request.app_version, sentAt };
}

/** Sends the feedback with its pictures (JPEG files, at most MAX_PICTURES) and waits for the mill's receipt. Throws a TutorError. */
function sendFeedback(request: FeedbackRequest, files: MillFile[], options: AskOptions): Promise<FeedbackAnswer> {
  return askGrind(FEEDBACK_KIND, request, isFeedbackAnswer, { ...options, files, untimed: true });
}

/** Sends `request` (with its pictures, if any) with the phone's key, keeps it in the requests table with its grist id once it is sent,
 * waits for the mill's receipt and tells the bus ('feedback-sent'). Throws a TutorError whatever went wrong; nothing is announced then. A `signal` that aborts stops the wait. */
export async function submitFeedback(
  request: FeedbackRequest,
  options: { files?: MillFile[]; signal?: AbortSignal; /** called once the grist is out, before the receipt is waited for */ onSent?: () => void } = {},
): Promise<void> {
  let keeping: Promise<void> = Promise.resolve();
  try {
    await sendFeedback(request, options.files ?? [], {
      key: getDeviceKeyBytes(),
      signal: options.signal,
      // A grist that went out is kept even if the receipt never comes; a failed write never turns a sent request into a failed one.
      onSent: (txid) => {
        options.onSent?.();
        keeping = keepRequest(kept(request, txid, Date.now())).catch(() => undefined);
      },
    });
  } catch (err) {
    await keeping;
    throw err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
  }
  await keeping;
  if (options.signal?.aborted) return;
  publish({ kind: 'feedback-sent', feedback: request.kind });
}
