// src/services/feedback.ts — feedback to the factory: a grist of the kind 'feedback' (grinds/feedback.json) with the app's version, his words and, for a grammar approach, who to credit and up to
// four pictures attached; or, for an ask the tutor could not meet, the tutor's one-line summary and the screen he asked from; or, for a book (Ask for a book, src/library/AskForBook.tsx), its
// title and, when he picked it from his Logos list, the row's Resource ID, Type, Series and ReferenceSupersets; or, for the whole of an import's list (Ask the makers about these), the counts by Logos
// type and the usable rows as one attached library.csv; or, for an ask of Settings > Ask for more (an approach or programme, a text, a translation), what he wants, why and a link. This is the ONE
// sender: Ask for another approach, Ask for a book, the Ask for more forms and the tutor's 'Send this to the makers' all call submitFeedback (tests/unit/feedback-shared.test.ts keeps it so). The
// wire work is src/services/tutor.ts's askGrind. The grind forwards ("forward": "mayor"): no model reads it, the mill mails it to the Mayor with the pictures or the file and answers {"status":"sent"}.
import { createRequests, GROWN_UP } from 'pwa-kit/requests';
import { publish } from '../events/bus';
import type { BookAsk } from '../data/repositories/bookRequests';
import { keepRequest, requestStore } from '../data/repositories/requests';
import { getDeviceKeyBytes } from './deviceKey';
import type { Kind } from '../resources/catalogue';
import { MILL_MAX_FILES, type MillFile } from './mill';
import { askGrind, TutorError, type AskOptions } from './tutor';
import { MAX_QUESTION_CHARS } from './requestBudget';
import type { MemorizingEvidence } from '../memorize/evidence';

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
/** What he asked the tutor, sent whole by Send this to the makers: as long as a question may be (src/services/requestBudget.ts), so a long pasted question is never refused here. */
export const MAX_ASKED_CHARS = MAX_QUESTION_CHARS;
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

/** The most a book's title (and author) may be: the input schema's `book` branch. */
export const MAX_BOOK_CHARS = 200;
/** The most a book's Resource ID, Logos type and series may be, and its ReferenceSupersets cell (cut at a whole token when longer). */
export const MAX_RESOURCE_CHARS = 80;
export const MAX_TYPE_CHARS = 80;
export const MAX_SERIES_CHARS = 200;
export const MAX_REFS = 600;

/** What the grind is sent when he asks for a book (Ask for a book): its title as he typed it or the picked row's, and from a pick the row's Logos details, so the Mayor can add it to the rules
 * without research; the kind of book he wants (a grammar, a devotional) and why, when he said. */
export interface BookRequest {
  kind: 'book';
  title: string;
  resource?: string;
  type?: string;
  series?: string;
  refs?: string;
  kindWanted?: Kind;
  why?: string;
  app_version: string;
}

/** The most types a library request counts: the ones with the most books. */
export const MAX_COUNT_TYPES = 40;

/** What the grind is sent, once for an import, when he taps Ask the makers about these: how many books the list has, how many rows the attached library.csv holds, the counts by Logos type of the books
 * Lampas cannot use, and the catalogue version he sent it under. The rows themselves are the file, not the request. */
export interface LibraryRequest {
  kind: 'library';
  books: number;
  usable: number;
  counts: Record<string, number>;
  catalogue_version: string;
  app_version: string;
}

/** The kinds of ask on Settings > Ask for more, each a short form (the input schema's last branch): an approach or programme, a text, a translation. A study resource is asked for as a book. */
export const MORE_KINDS = ['approach', 'text', 'translation'] as const;
export type MoreKind = (typeof MORE_KINDS)[number];

/** The most the name of what he asks for may be. */
export const MAX_MORE_NAME = 120;

/** What the grind is sent from an Ask for more form: what he wants by name, why (when he said), a link (when he gave one) and, only when he turned it on for this ask, his memorizing evidence (mw-fu7dqf.12). */
export interface MoreRequest {
  kind: MoreKind;
  name: string;
  text?: string;
  url?: string;
  memorizing?: MemorizingEvidence;
  app_version: string;
}

/** One miss the nightly run found worth a story: what to build, why, the screen the tutor missed it on and how many times since the last run. */
export interface MissWorthAStory {
  title: string;
  why: string;
  screen: string;
  count: number;
}

/** What the grind is sent by the nightly tutor-weights run (src/tutor/weightsRun.ts), not by him: the misses worth a story, as lines of words and as data. It is not kept in Your requests: he did not ask. */
export interface MissesRequest {
  kind: 'tutor-misses';
  text: string;
  summary: string;
  misses: MissWorthAStory[];
  app_version: string;
}

/** The most misses one forward carries: the input schema's. */
export const MAX_MISSES = 5;

/** The request for `misses` (at most MAX_MISSES, each cut to the schema's lengths): a line for each in words, and the same as data. */
export function buildMissesRequest(misses: readonly MissWorthAStory[]): MissesRequest {
  const kept = misses.slice(0, MAX_MISSES).map((m) => ({ title: m.title.slice(0, 120), why: m.why.slice(0, 400), screen: m.screen.slice(0, 80), count: m.count }));
  const text = kept.map((m) => `${m.title} (${m.screen}, missed ${m.count} ${m.count === 1 ? 'time' : 'times'}): ${m.why}`).join('\n');
  return { kind: 'tutor-misses', text, summary: `Tutor misses worth a story: ${kept.length}`, misses: kept, app_version: __APP_VERSION__ };
}

export type FeedbackRequest = GrammarApproachRequest | TutorAskRequest | BookRequest | LibraryRequest | MoreRequest;

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

/** `refs` cut at a whole token (the cell's tokens are separated by tabs) so it fits `max`. */
function cutRefs(refs: string, max: number): string {
  if (refs.length <= max) return refs;
  const kept: string[] = [];
  let length = 0;
  for (const token of refs.split('\t')) {
    length += token.length + (kept.length ? 1 : 0);
    if (length > max) break;
    kept.push(token);
  }
  return kept.join('\t');
}

/** The request for a book: the title trimmed, and each other field only when it was given (an empty one is left out). */
export function buildBookRequest(ask: BookAsk): BookRequest {
  const field = (value: string | undefined, max = Infinity): string => (value?.trim() ?? '').slice(0, max);
  const [resource, type, series, why] = [field(ask.resource, MAX_RESOURCE_CHARS), field(ask.type, MAX_TYPE_CHARS), field(ask.series, MAX_SERIES_CHARS), field(ask.why)];
  const refs = cutRefs(field(ask.refs), MAX_REFS);
  return {
    kind: 'book',
    title: ask.title.trim(),
    ...(resource ? { resource } : {}),
    ...(type ? { type } : {}),
    ...(series ? { series } : {}),
    ...(refs ? { refs } : {}),
    ...(ask.kindWanted ? { kindWanted: ask.kindWanted } : {}),
    ...(why ? { why } : {}),
    app_version: __APP_VERSION__,
  };
}

/** The request for the whole list: the counts of the types with the most books (at most MAX_COUNT_TYPES), the number of rows in the file, and the catalogue version. */
export function buildLibraryRequest(list: { books: number; usable: number; counts: Record<string, number>; version: string }): LibraryRequest {
  const counts = Object.fromEntries(Object.entries(list.counts).sort((a, b) => b[1] - a[1]).slice(0, MAX_COUNT_TYPES));
  return { kind: 'library', books: list.books, usable: list.usable, counts, catalogue_version: list.version, app_version: __APP_VERSION__ };
}

/** The request of an Ask for more form: the name trimmed; why and the link only when he wrote them (https:// put in front of a bare link); `memorizing` only when he said to send his evidence. */
export function buildMoreRequest(kind: MoreKind, name: string, why = '', link = '', memorizing?: MemorizingEvidence): MoreRequest {
  const text = why.trim();
  const url = linkOf(link);
  return { kind, name: name.trim(), ...(text ? { text } : {}), ...(url ? { url } : {}), ...(memorizing ? { memorizing } : {}), app_version: __APP_VERSION__ };
}

/** The most a tutor-ask request may weigh, as JSON in UTF-8: what a talk's was (8,000; src/services/requestBudget.ts raised that to 9,000 for the digest of his shelf, mw-rfjjzd.10, which this request never carries). Greek is two bytes a letter, so the facts are what gives way. */
export const MAX_ASK_BYTES = 8000;

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

/** What the requests table keeps of a request: for a tutor-ask the tutor's summary and his own words, his words for a grammar approach, the title of a book (and its Resource ID, which finds it again), a line that
 * counts the books of a library request, and for an Ask for more form the name with why after it ('The ESV: To read it beside the Greek.'). */
function kept(request: FeedbackRequest, txid: string, sentAt: number, files: readonly MillFile[]): Parameters<typeof keepRequest>[0] {
  const what =
    request.kind === 'tutor-ask'
      ? { summary: request.summary, words: request.text }
      : request.kind === 'book'
        ? { text: request.title, ...(request.resource ? { resource: request.resource } : {}) }
        : request.kind === 'library'
          ? { text: `My Logos library: ${request.usable} of ${request.books} books` }
          : 'name' in request
            ? { text: request.text ? `${request.name}: ${request.text}` : request.name }
            : { text: request.text };
  // a tutor-ask's files are the talk's pictures: the row says how many went (Your requests shows it)
  const pictures = request.kind === 'tutor-ask' && files.length > 0 ? { pictures: files.length } : {};
  return { txid, kind: request.kind, ...what, ...pictures, app_version: request.app_version, sentAt };
}

/** Sends the feedback with its files (pictures, at most MAX_PICTURES, or the library.csv) and waits for the mill's receipt. Throws a TutorError. */
function sendFeedback(request: FeedbackRequest | MissesRequest, files: MillFile[], options: AskOptions): Promise<FeedbackAnswer> {
  return askGrind(FEEDBACK_KIND, request, isFeedbackAnswer, { ...options, files, untimed: true });
}

type SubmitOptions = { files?: MillFile[]; signal?: AbortSignal; /** called once the grist is out, before the receipt is waited for */ onSent?: () => void };

/** Sends `request` with the phone's key, keeps it in the requests table with its grist id once it is sent, waits for the mill's receipt and tells the
 * bus ('feedback-sent'). Resolves with the grist's id. Throws a TutorError whatever went wrong; nothing is announced then. */
async function deliver(request: FeedbackRequest, options: SubmitOptions): Promise<string> {
  let keeping: Promise<void> = Promise.resolve();
  let txid = '';
  try {
    await sendFeedback(request, options.files ?? [], {
      key: getDeviceKeyBytes(),
      signal: options.signal,
      // A grist that went out is kept even if the receipt never comes; a failed write never turns a sent request into a failed one.
      onSent: (id) => {
        txid = id;
        options.onSent?.();
        keeping = keepRequest(kept(request, id, Date.now(), options.files ?? [])).catch(() => undefined);
      },
    });
  } catch (err) {
    await keeping;
    throw err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
  }
  await keeping;
  if (!options.signal?.aborted) publish({ kind: 'feedback-sent', feedback: request.kind });
  return txid;
}

/** The tutor's asks, filed through pwa-kit/requests (src/services/feedback.ts is the kit's sender). Lampas counts no requests a day (its caps are the size of a
 * request, src/services/requestBudget.ts), so the kit's day budget is as large as a number can be. The kit's request has no screen or facts, so the wire request
 * waits here under the token the kit carries as the talk's id, and `send` takes it back. */
const NO_DAILY_COUNT = Number.MAX_SAFE_INTEGER;
const waiting = new Map<string, { request: TutorAskRequest; options: SubmitOptions }>();
let tokens = 0;
const tutorAsks = createRequests({
  appVersion: __APP_VERSION__,
  perDay: NO_DAILY_COUNT,
  store: requestStore(__APP_VERSION__),
  send: async ({ reference }) => {
    const ask = waiting.get(reference);
    if (!ask) throw new TutorError('not-sent', 'Something went wrong.');
    return { id: await deliver(ask.request, ask.options) };
  },
});

/** What he is told when the kit takes his ask for one already filed today: nothing was sent now. */
export const ALREADY_SENT_MESSAGE = 'You already sent this today. The answer will come back in Your requests.';

/** Sends `request` (with its pictures, if any) with the phone's key, keeps it in the requests table with its grist id once it is sent,
 * waits for the mill's receipt and tells the bus ('feedback-sent'). Throws a TutorError whatever went wrong (the kit's 'refused' or 'duplicate' too: only its 'sent' is a send); nothing is announced then. A `signal` that aborts stops the wait.
 * The tutor's ask (kind 'tutor-ask', from a talk) is filed through pwa-kit/requests (fileFromTalk: who asked is the one reader, the grown-up); the forms' requests
 * carry a link, a credit or pictures the kit's request has no place for, so they are delivered directly. */
export async function submitFeedback(request: FeedbackRequest, options: SubmitOptions = {}): Promise<void> {
  if (request.kind !== 'tutor-ask') {
    await deliver(request, options);
    return;
  }
  const token = `tutor-ask-${(tokens += 1)}`;
  waiting.set(token, { request, options });
  try {
    const result = await tutorAsks.fileFromTalk({ talkId: token, words: request.text, who: GROWN_UP, kind: request.kind, summary: request.summary });
    if (result.outcome === 'refused') throw new TutorError('not-sent', result.message);
    // the kit took it for a twin of one filed today: it sent nothing, so this tap is not a send; he is told the first one is on its way
    if (result.outcome === 'duplicate') throw new TutorError('not-sent', ALREADY_SENT_MESSAGE);
  } finally {
    waiting.delete(token);
  }
}

/** Forwards the misses the nightly run found worth a story to the factory: one feedback grist, mailed to the Mayor by the mill, with the phone's key. Not kept in Your requests and not announced on the bus. Throws a TutorError. */
export async function forwardMisses(misses: readonly MissWorthAStory[], options: { key?: Uint8Array; signal?: AbortSignal } = {}): Promise<void> {
  await sendFeedback(buildMissesRequest(misses), [], { key: options.key ?? getDeviceKeyBytes(), signal: options.signal });
}
