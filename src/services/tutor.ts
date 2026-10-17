// src/services/tutor.ts — the tutor: one question about a verse, sent as a grist through Postern (bsv-kit/grist)
// and answered by the mill's verse-ask grind (grinds/verse-ask.json). All the wire work is bsv-kit's: the door signs
// every call with the device key, mill.ts sends (bsv-kit's sendGristRecord, with client_timing) and seals the request to the mill, waitForAnswer pages for the reply
// from the grist's own place in the backend's sequence.
import { door } from 'bsv-kit/bsv';
import { POSTERN_DOOR } from '../config';
import { markSupplied, type Verse } from '../data/chapter';
import type { AnswerWord } from '../data/db';
import { isAnswerBridge, type AnswerBridge, type MissingFoundations } from '../data/grammar/bridge';
import type { LearnerGrammar } from '../data/grammar/learnerGrammar';
import type { LearnerProfile } from '../data/learnerProfile';
import type { MemoryField } from '../data/learnerMemory';
import type { TutorRequest } from '../data/requestsForTutor';
import type { RustyItem } from '../data/rusty';
import { DEFAULT_PRONUNCIATION, pronunciationOf, tutorGuideOf, type GreekPronunciation } from '../speech/pronunciation';
import { MAX_QUESTION_CHARS, MAX_REQUEST_BYTES } from './requestBudget';
import { solidWordsField } from './solidWords';
import { claimReport, noteAnswer, releaseReport } from './clientTiming';
import type { GristKind } from './gristKinds';
import { listenForAnswers, type StreamTarget } from './answerStream';
import { AwaitAbortedError, BackendStatusError, GristInputError, meOf, readTimedPage, SendUnknownError, sendTimedGrist, timedDoor, type MillAnswer, type MillFile, type Page, type Resend, type SentGrist, type TimedDoor } from './mill';

/** The app and kind the mill runs the grind under (grinds/verse-ask.json), and the version of the request below. */
export const TUTOR_APP = 'lampas';
export const TUTOR_KIND = 'verse-ask';
export const TUTOR_VERSION = '1';

/** How long a question may be (src/services/requestBudget.ts). */
export { MAX_QUESTION_CHARS };

/**
 * How long the send and the wait for an answer go on with no call to Postern succeeding before it says the tutor could not be reached.
 * One poll gives up after pollTimeoutMs, so this lets polls fail for a while (a train through a tunnel, a phone changing
 * from wifi to data) before the wait is called lost; the 180 s deadline below still ends a wait that has contact but no answer.
 */
export const CONTACT_LOST_MS = 90_000;

/** The timings, in one object so a test may shorten them. */
export const tutorTimings = {
  /** How often the mill is asked whether it has answered while the event stream is not up: a poll starts this often, whether or not the one before has come back. */
  pollMs: 3000,
  /** The same while the event stream is up (src/services/answerStream.ts): the stream names the answer the moment the backend has it, and the poll is the backstop for what it missed. */
  backstopMs: 15_000,
  /**
   * How long one poll (the sign-in code and the page, its body too) may take before it is given up on. The door's own 30 s ends
   * at the page's headers, so a body that stalled on mobile data was never given up on (mw-5r3p30.269).
   */
  pollTimeoutMs: 30_000,
  /** How long it has to answer before the question is given up on. */
  deadlineMs: 180_000,
  /** How long the door gives any one call before it gives up on it: the door's own 30 s. */
  doorTimeoutMs: door.API_TIMEOUT_MS,
  /** CONTACT_LOST_MS, for a test to shorten. */
  contactLostMs: CONTACT_LOST_MS,
};

/** The most polls out at once: a slow one is not abandoned for being slow, and a stalled one does not hold up the next. */
const POLLS_IN_FLIGHT = 3;

/** One page of the wait: rejects with the door's ApiTimeoutError (and aborts it) when it has not come, body and all, in pollTimeoutMs,
 * and with an AwaitAbortedError at once when `signal` aborts, even from a fetch that does not heed its signal. */
async function readPage(txid: string, d: TimedDoor, key: Uint8Array, since: number, mill: string, signal: AbortSignal): Promise<Page> {
  const poll = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort = (): void => undefined;
  const cut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new door.ApiTimeoutError(false));
      poll.abort();
    }, tutorTimings.pollTimeoutMs);
    onAbort = (): void => {
      reject(new AwaitAbortedError());
      poll.abort();
    };
  });
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });
  try {
    return await Promise.race([readTimedPage(txid, { door: d, key, since, mill, signal: poll.signal }), cut]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

/** What waiting for an answer found: the answer, when a poll saw it, when the backend first saw its record, and how long the poll that saw it took. */
interface Waited {
  answer: MillAnswer;
  seenAt: number;
  deliveredAt?: number;
  pollNetwork: number;
}

/**
 * Pages Postern for the mill's answer to the grist `txid` until it comes, which `signal` stops (AwaitAbortedError). It pages from
 * `since`, the grist's own place in the backend's sequence (the answer comes after it): from 0, the first page was every record the
 * phone ever sent or was sent, megabytes for a phone that has asked a lot and a minute on mobile data (mw-5r3p30.269, and 142 MB over 124 asks in the nginx log, mw-5r3p30.275). A `since` the
 * backend's head has not reached (it names a `next` below it: a reset backend or a new mill) is read from 0 once, so the answer is still found. With `stream` (the backend
 * serves GET /api/events) the wait also listens on it while it waits, and pages at once when the stream names a record after `since` or says hello
 * (mw-46z0my.6); the stream is closed when the wait ends. A poll starts every pollMs (backstopMs while the stream is up) while fewer than
 * POLLS_IN_FLIGHT are out, so one that stalls does not hold up the next. A page that fails (it timed out, no connection, a 5xx) does not end the wait:
 * only when no call has succeeded for CONTACT_LOST_MS (`lastContact` is when one last did) does it throw that failure. A licence refusal ends it at once. bsv-kit's awaitAnswer ends at
 * the first failed page, which a phone that blinks offline for a moment turns into 'could not reach the tutor'.
 */
function waitForAnswer(txid: string, since: number, mill: string, d: TimedDoor, key: Uint8Array, signal: AbortSignal, stream?: StreamTarget, contactAt = Date.now()): Promise<Waited> {
  return new Promise((resolve, reject) => {
    const polls = new AbortController();
    let lastContact = contactAt;
    let out = 0;
    // a place the backend's sequence has not reached (it was reset, or is a new mill) is read from 0, once
    let fellBack = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    let listening: ReturnType<typeof listenForAnswers> | undefined;
    const finish = (end: () => void): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      listening?.close();
      polls.abort();
      end();
    };
    const onAbort = (): void => finish(() => reject(new AwaitAbortedError()));
    const failed = (err: unknown): void => {
      if (err instanceof door.RefusedError || Date.now() - lastContact >= tutorTimings.contactLostMs) finish(() => reject(err));
    };
    const poll = (): void => {
      if (done) return;
      clearTimeout(timer);
      if (out < POLLS_IN_FLIGHT) {
        out += 1;
        const asked = since;
        readPage(txid, d, key, asked, mill, polls.signal)
          .then((result) => {
            lastContact = Date.now();
            if (!result.answer && !fellBack && asked > 0 && result.head < asked) {
              fellBack = true;
              since = 0;
              poll();
              return;
            }
            // a poll still out from before the fallback must not put the cursor back
            if (asked <= since) since = Math.max(since, result.next);
            const { answer } = result;
            if (answer) finish(() => resolve({ answer, seenAt: lastContact, deliveredAt: result.deliveredAt, pollNetwork: result.took }));
          }, failed)
          .finally(() => (out -= 1));
      }
      timer = setTimeout(poll, listening?.live() ? tutorTimings.backstopMs : tutorTimings.pollMs);
    };
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    poll();
    // a record that comes after the grist's own place may be the answer; one at or before it cannot be
    if (stream) listening = listenForAnswers(stream, { wake: (seq) => (seq === undefined || seq > since) && poll(), down: poll });
  });
}

/** What the grind is sent (Verse Ask Request 1): the verse in both languages, his words, his question. */
export interface VerseAskRequest {
  reference: string;
  greek: string;
  english: string;
  question: string;
  /** present (true) only when the question was spoken to the phone's English recogniser (mw-5r3p30.244): a Greek word in it may have come as English sound-alikes */
  spoken?: true;
  /** how many solid words he has (src/services/solidWords.ts) and the most recent few of them, newest last */
  solid_count?: number;
  solid_words: string[];
  /** where he stands (src/data/learnerSummary.ts): solid count, the learning words, today's new words, what is due */
  learner?: string;
  /** where his grammar stands (src/data/grammar/learnerGrammar.ts) */
  learner_grammar?: LearnerGrammar;
  /** who he is as a student (src/data/learnerProfile.ts, Settings > About you): missing when he has filled in nothing */
  learner_profile?: LearnerProfile;
  /** what Lampas remembers of him (src/data/learnerMemory.ts, Settings > Memory), as the Bible talk is sent it: missing when nothing is kept */
  memory?: MemoryField;
  /** the Greek pronunciation the app speaks and respells in (src/speech/pronunciation.ts), as the Bible talk is sent it: a sound is described by it */
  pronunciation: GreekPronunciation;
  /** that pronunciation's name and sound rules, from its scheme (mw-5r3p30.268, Pronunciation.tutorGuide): a sound is described by them */
  pronunciation_guide?: string;
  /** the settings that bear on this answer, by key (src/tutor/knows.ts settingsSentTo): { hebrewDepth: 'both', askBy: 'speaking', weave: 'off', ... } */
  settings?: Record<string, string>;
  /** the requests he sent to the factory and where each stands (src/data/requestsForTutor.ts): up to 10, newest first; missing when he has sent none */
  requests?: TutorRequest[];
  /** present only when the grammar words of his question name a topic that rests on ideas he lacks (mw-1vuvq6.5, src/data/grammar/bridge.ts), as the Bible talk is sent it */
  missing_foundations?: MissingFoundations;
  /** the solid words and ideas he now slips on or has not met for a long while (mw-1vuvq6.6, src/data/rusty.ts), as the Bible talk is sent it; missing when none. The tutor may say so in its answer; the offer to move them is the Bible talk's. */
  rusty?: RustyItem[];
}

/** What the grind answers (grinds/verse-ask.answer.schema.json). */
export interface VerseAnswer {
  answer: string;
  words: AnswerWord[];
  /** what he asked, cleaned up by the tutor (punctuation, capitals, no fillers); shown in place of his raw words when present */
  question?: string;
  /** the one setting the tutor may switch when he asks, Ask by (grinds/verse-ask.answer.schema.json). The schema holds the tutor to one exact change,
   * but the app reads whatever arrives and takes only what askByChange accepts: a change it refuses never costs him the answer (mw-5r3p30.171). */
  settings_changes?: unknown;
  /** only when the request carried `missing_foundations` (mw-1vuvq6.5): up to three of those ideas he lacks, the one to start with and why */
  bridge?: AnswerBridge;
}

export type AskByChange = { key: 'askBy'; value: 'speaking' | 'typing' };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

/** The change the app makes from an answer: the first entry that sets Ask by to Speaking or Typing (any case), wherever it stands in the list;
 * every other entry is ignored, so a refused change before it never drops it (mw-5r3p30.191). */
export function askByChange(answer: VerseAnswer): AskByChange[] {
  const list: unknown[] = Array.isArray(answer.settings_changes) ? answer.settings_changes : [];
  for (const entry of list) {
    if (!isObject(entry) || entry.key !== 'askBy' || typeof entry.value !== 'string') continue;
    const value = entry.value.trim().toLowerCase();
    if (value === 'speaking' || value === 'typing') return [{ key: 'askBy', value }];
  }
  return [];
}

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isVerseAnswer(value: unknown): value is VerseAnswer {
  if (!isObject(value) || Object.keys(value).some((k) => k !== 'answer' && k !== 'words' && k !== 'question' && k !== 'settings_changes' && k !== 'bridge') || !isText(value.answer, 1200)) return false;
  if ('question' in value && !isText(value.question, MAX_QUESTION_CHARS)) return false;
  if ('bridge' in value && !isAnswerBridge(value.bridge)) return false;
  if (!Array.isArray(value.words) || value.words.length > 12) return false;
  return value.words.every((w) => isObject(w) && Object.keys(w).length === 3 && isText(w.greek, 80) && isText(w.lemma, 80) && isText(w.note, 300));
}

export function buildRequest(reference: string, verse: Verse, question: string, solidWords: string[], learner?: string, learnerGrammar?: LearnerGrammar, settings?: Record<string, string>, requests: TutorRequest[] = [], learnerProfile?: LearnerProfile, spoken = false, pronunciation: GreekPronunciation = DEFAULT_PRONUNCIATION, memory?: MemoryField, missingFoundations?: MissingFoundations, rusty?: RustyItem[]): VerseAskRequest {
  return {
    reference,
    greek: verse.g.map((w) => w.t).join(' '),
    english: verse.e.map(markSupplied).join(' '),
    question: question.trim(),
    ...(spoken ? { spoken: true as const } : {}),
    ...solidWordsField(solidWords),
    pronunciation,
    pronunciation_guide: tutorGuideOf(pronunciationOf(pronunciation)),
    ...(learner ? { learner } : {}),
    ...(learnerGrammar ? { learner_grammar: learnerGrammar } : {}),
    ...(learnerProfile ? { learner_profile: learnerProfile } : {}),
    ...(memory ? { memory } : {}),
    ...(settings ? { settings } : {}),
    ...(requests.length > 0 ? { requests } : {}),
    ...(missingFoundations ? { missing_foundations: missingFoundations } : {}),
    ...(rusty && rusty.length > 0 ? { rusty } : {}),
  };
}

/** Why a question did not come back with an answer. */
export type TutorFailure = 'no-licence' | 'unreachable' | 'not-sent' | 'no-answer';

/** What each way a question can fail is called in the box (the Bible talk's sheet says the same). */
export const FAILURE_TITLES: Record<TutorFailure, string> = {
  'no-licence': 'No licence',
  unreachable: 'Could not reach the tutor',
  'not-sent': 'Could not send the question',
  'no-answer': 'Could not reach the tutor',
};

/** What the box says when his phone has no connection, and when the backend answers but the tutor (the factory's home) does not: the
 * two are different and the second is never his phone's fault (mw-5r3p30.340). Every surface shows TutorError.message, so these are the only copies. */
export const OFFLINE_MESSAGE = 'You are offline. Check your connection and try again.';
export const TUTOR_OFFLINE_MESSAGE = 'The tutor is offline right now. This is not your connection; try again later.';

const phoneIsOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

export class TutorError extends Error {
  readonly failure: TutorFailure;
  /** Set when the grist went out (or may have) and the link, not the mill, failed: the backend may hold it, and its answer may come.
   * Asking again with it as AskOptions.resend sends the same grist again, which finds the one the backend holds: never a second (mw-5r3p30.302). */
  readonly resend?: Resend;
  constructor(failure: TutorFailure, message: string, resend?: Resend) {
    super(message);
    this.failure = failure;
    this.name = 'TutorError';
    if (resend) this.resend = resend;
  }
}

/** A call that failed on the way (no reply in time, no connection, a gateway or a 5xx), not one the backend refused. */
const lostOnTheWay = (err: unknown): boolean =>
  err instanceof SendUnknownError || err instanceof door.ApiTimeoutError || err instanceof door.BackendUnreachableError || (err instanceof BackendStatusError && err.status >= 500);

/** Waits `ms`, or rejects with an AwaitAbortedError at once when `signal` aborts. */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new AwaitAbortedError());
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new AwaitAbortedError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Sends the grist with `first`, and once it may have gone (`first` threw SendUnknownError, or this is a resend) sends its same bytes again every pollMs
 * until the backend names it, as the wait pages for an answer: a send whose reply was lost on a stalled link is the backend's all the same, and its
 * answer will come (mw-5r3p30.302). Gives up with the last failure once no call has succeeded for CONTACT_LOST_MS since `contactAt`, at once on a refusal,
 * and with an AwaitAbortedError when `signal` aborts. `known` is told the resend as soon as there is one.
 */
async function sendSurely(first: () => Promise<SentGrist>, resend: Resend | undefined, d: TimedDoor, signal: AbortSignal, contactAt: number, known: (resend: Resend) => void): Promise<SentGrist> {
  let again = resend;
  for (;;) {
    try {
      return await (again ? again(d) : first());
    } catch (err) {
      if (err instanceof SendUnknownError) {
        again = err.resend;
        known(again);
      }
      if (!again || !lostOnTheWay(err) || Date.now() - contactAt >= tutorTimings.contactLostMs) throw err instanceof SendUnknownError ? err.cause : err;
    }
    await pause(tutorTimings.pollMs, signal);
  }
}

/** The door's and the grist's failures in the words the Ask box shows. */
function explain(err: unknown): TutorError {
  if (err instanceof TutorError) return err;
  if (err instanceof door.RefusedError && err.message === door.LICENCE_REQUIRED) {
    return new TutorError('no-licence', 'This phone holds no Lampas licence the tutor accepts.');
  }
  if (err instanceof GristInputError) return new TutorError('not-sent', err.message);
  if (err instanceof door.RefusedError) return new TutorError('unreachable', err.message);
  // the phone has no network only when the browser says so (mw-5r3p30.433): a call that failed before any response is no proof, since the gateway's
  // error page with no CORS headers, and a refused connection with the factory's home off, fail just as a lost network does (a TypeError)
  if (phoneIsOffline()) return new TutorError('unreachable', OFFLINE_MESSAGE);
  // the backend answered with a gateway error, could not be reached with the phone online, or did not answer in time: it is the tutor's side that is down
  if (lostOnTheWay(err)) {
    return new TutorError('unreachable', TUTOR_OFFLINE_MESSAGE);
  }
  return new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
}

export interface AskOptions {
  /** The device key's 32 bytes: it signs every call and opens the answer. */
  key: Uint8Array;
  /** Stops the wait (the screen went away); nothing is thrown away that was already kept. */
  signal?: AbortSignal;
  /** When he tapped (epoch ms; for a reading, when the recording ended): the start of the round trip the phone times. Default: now, as askGrind is called. */
  tapAt?: number;
  /** Not a tutor answer to time, so no client_timing is kept or sent for it (the feedback grind, which the mill only forwards). */
  untimed?: boolean;
  /** Called once the question has been sent and the wait for the answer begins, with the grist's id. The screen that draws the answer calls
   * answerDrawn(txid) (src/services/clientTiming.ts) once it has, which completes the answer's timing. */
  onSent?: (txid: string) => void;
  /** Files sent with the grist: a recording of him reading (src/services/reading.ts). */
  files?: MillFile[];
  /** The resend of a failed ask (TutorError.resend): the same grist is sent again, so the answer to the one the backend may hold is waited for, and
   * no second grist is made; `request` and `files` are not sent. */
  resend?: Resend;
  baseUrl?: string;
}

/**
 * Sends `request` to the mill's grind `kind` (one of gristKinds.ts GRIST_KINDS) and waits for its answer, which `isAnswer` must accept. Throws a TutorError:
 * no-licence, unreachable, not-sent (the grist was refused for its shape, nothing went out) or no-answer (the mill refused
 * or failed, or answered in a shape this app cannot use, or took past the deadline). The tutor and the Bible talk
 * (src/services/talk.ts) are two kinds sent this one way.
 */
export async function askGrind<Answer>(kind: GristKind, request: object, isAnswer: (value: unknown) => value is Answer, options: AskOptions): Promise<Answer> {
  const { key } = options;
  const tapAt = options.tapAt ?? Date.now();
  const d = timedDoor(new door.Door({ baseUrl: options.baseUrl ?? POSTERN_DOOR, key, timeoutMs: tutorTimings.doorTimeoutMs }));
  const deadline = new AbortController();
  const stop = (): void => deadline.abort();
  options.signal?.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, tutorTimings.deadlineMs);
  // the timing of his previous answer rides with this grist (and is let go again if the grist never reaches the backend)
  // a resend carries the timing its first sending did
  const report = options.untimed || options.resend ? undefined : claimReport();
  // a resend is of a grist that may have gone: a failure before it is sent again still keeps it, so the next Retry makes no second one either
  let sent = options.resend !== undefined;
  // how to send this grist again, once it may have gone
  let resend = options.resend;
  try {
    const { mill, events } = await meOf(d, deadline.signal);
    const contactAt = Date.now();
    const send = async (): Promise<SentGrist> => {
      const grist = await sendTimedGrist({ door: d, key, mill, app: TUTOR_APP, kind, v: TUTOR_VERSION, input: request, files: options.files ?? [], clientTiming: report });
      resend = grist.resend;
      return grist;
    };
    const { txid, seq } = await sendSurely(send, resend, d, deadline.signal, contactAt, (known) => {
      // it may have gone: its timing is not given back to ride on the next one
      sent = true;
      resend = known;
    });
    sent = true;
    const sentAt = Date.now();
    const sendNetwork = d.total;
    options.onSent?.(txid);
    const waited = await waitForAnswer(txid, seq, mill, d, key, deadline.signal, events ? { baseUrl: options.baseUrl ?? POSTERN_DOOR, key } : undefined, sentAt);
    const reply = waited.answer;
    if (reply.status !== 'answered') {
      throw new TutorError('no-answer', reply.reason ? `The tutor could not answer: ${reply.reason}` : 'The tutor could not answer.');
    }
    if (!isAnswer(reply.answer)) throw new TutorError('no-answer', 'The tutor sent an answer this app could not read.');
    if (!options.untimed) noteAnswer(txid, { tapAt, sentAt, seenAt: waited.seenAt, deliveredAt: waited.deliveredAt, sendNetwork, pollNetwork: waited.pollNetwork });
    return reply.answer;
  } catch (err) {
    if (report && !sent) releaseReport(report.txid);
    if (err instanceof AwaitAbortedError && !options.signal?.aborted) throw new TutorError('no-answer', phoneIsOffline() ? OFFLINE_MESSAGE : TUTOR_OFFLINE_MESSAGE);
    const failure = explain(err);
    // the grist went (or may have) and the link failed: the backend may hold it, and Retry is to find it, not to send a second
    if (resend && sent && lostOnTheWay(err)) throw new TutorError(failure.failure, failure.message, resend);
    throw failure;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', stop);
  }
}

/**
 * Makes the request fit a grist, as the Bible talk's fitHistory does (src/services/talk.ts): while it is over MAX_REQUEST_BYTES the pronunciation's guide goes first,
 * then the oldest of his solid words, his requests (the last in the list, newest first) and his notes (from the end of the list; the index always stays). The verse and his question are never cut.
 */
export function fitAsk(request: VerseAskRequest): VerseAskRequest {
  let guide = request.pronunciation_guide;
  let solid = request.solid_words;
  let requests = request.requests;
  let notes = request.memory?.notes;
  const fitted = (): VerseAskRequest => ({
    ...request,
    pronunciation_guide: guide,
    solid_words: solid,
    ...(requests ? { requests } : {}),
    ...(request.memory && notes ? { memory: { ...request.memory, notes } } : {}),
  });
  const tooBig = (): boolean => new TextEncoder().encode(JSON.stringify(fitted())).length > MAX_REQUEST_BYTES;
  if (!tooBig()) return request;
  guide = undefined;
  while (solid.length > 0 && tooBig()) solid = solid.slice(1);
  while (requests && requests.length > 0 && tooBig()) requests = requests.slice(0, -1);
  while (notes && notes.length > 0 && tooBig()) notes = notes.slice(0, -1);
  return fitted();
}

/** Sends the question about a verse and waits for the answer (the verse-ask grind). */
export function askTutor(request: VerseAskRequest, options: AskOptions): Promise<VerseAnswer> {
  return askGrind(TUTOR_KIND, fitAsk(request), isVerseAnswer, options);
}
