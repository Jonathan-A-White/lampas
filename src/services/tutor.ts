// src/services/tutor.ts — the tutor: one question about a verse, sent as a grist through Postern (bsv-kit/grist)
// and answered by the mill's verse-ask grind (grinds/verse-ask.json). All the wire work is bsv-kit's: the door signs
// every call with the device key, gristWire.ts sends (bsv-kit's sendGristRecord, with client_timing) and seals the request to the mill, waitForAnswer pages for the reply
// from the grist's own place in the backend's sequence.
import { door } from 'bsv-kit/bsv';
import { grist } from 'bsv-kit/grist';
import { POSTERN_DOOR } from '../config';
import { markSupplied, type Verse } from '../data/chapter';
import type { AnswerWord } from '../data/db';
import type { LearnerGrammar } from '../data/grammar/learnerGrammar';
import type { LearnerProfile } from '../data/learnerProfile';
import type { TutorRequest } from '../data/requestsForTutor';
import { claimReport, noteAnswer, releaseReport } from './clientTiming';
import { listenForAnswers, type StreamTarget } from './answerStream';
import { meOf, readTimedPage, sendTimedGrist, timedDoor, type Page, type TimedDoor } from './gristWire';

/** The app and kind the mill runs the grind under (grinds/verse-ask.json), and the version of the request below. */
export const TUTOR_APP = 'lampas';
export const TUTOR_KIND = 'verse-ask';
export const TUTOR_VERSION = '1';

/** How long a question may be: a grist's record is capped at 10 KiB and Greek letters take two bytes each. */
export const MAX_QUESTION_CHARS = 400;

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
};

/** The most polls out at once: a slow one is not abandoned for being slow, and a stalled one does not hold up the next. */
const POLLS_IN_FLIGHT = 3;

/**
 * How long the wait for an answer goes on with no call to Postern succeeding before it says the tutor could not be reached.
 * One poll gives up after pollTimeoutMs, so this lets polls fail for a while (a train through a tunnel, a phone changing
 * from wifi to data) before the wait is called lost; the 180 s deadline above still ends a wait that has contact but no answer.
 */
export const CONTACT_LOST_MS = 90_000;

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
      reject(new grist.AwaitAbortedError());
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
  answer: grist.GristAnswer;
  seenAt: number;
  deliveredAt?: number;
  pollNetwork: number;
}

/**
 * Pages Postern for the mill's answer to the grist `txid` until it comes, which `signal` stops (AwaitAbortedError). It pages from
 * `since`, the grist's own place in the backend's sequence (the answer comes after it): from 0, the first page was every record the
 * phone ever sent or was sent, megabytes for a phone that has asked a lot and a minute on mobile data (mw-5r3p30.269). With `stream` (the backend
 * serves GET /api/events) the wait also listens on it while it waits, and pages at once when the stream names a record after `since` or says hello
 * (mw-46z0my.6); the stream is closed when the wait ends. A poll starts every pollMs (backstopMs while the stream is up) while fewer than
 * POLLS_IN_FLIGHT are out, so one that stalls does not hold up the next. A page that fails (it timed out, no connection, a 5xx) does not end the wait:
 * only when no call has succeeded for CONTACT_LOST_MS does it throw that failure. A licence refusal ends it at once. bsv-kit's awaitAnswer ends at
 * the first failed page, which a phone that blinks offline for a moment turns into 'could not reach the tutor'.
 */
function waitForAnswer(txid: string, since: number, mill: string, d: TimedDoor, key: Uint8Array, signal: AbortSignal, stream?: StreamTarget): Promise<Waited> {
  return new Promise((resolve, reject) => {
    const polls = new AbortController();
    let lastContact = Date.now();
    let out = 0;
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
    const onAbort = (): void => finish(() => reject(new grist.AwaitAbortedError()));
    const failed = (err: unknown): void => {
      if (err instanceof door.RefusedError || Date.now() - lastContact >= CONTACT_LOST_MS) finish(() => reject(err));
    };
    const poll = (): void => {
      if (done) return;
      clearTimeout(timer);
      if (out < POLLS_IN_FLIGHT) {
        out += 1;
        readPage(txid, d, key, since, mill, polls.signal)
          .then((result) => {
            lastContact = Date.now();
            since = Math.max(since, result.next);
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
  solid_words: string[];
  /** where he stands (src/data/learnerSummary.ts): solid count, the learning words, today's new words, what is due */
  learner?: string;
  /** where his grammar stands (src/data/grammar/learnerGrammar.ts) */
  learner_grammar?: LearnerGrammar;
  /** who he is as a student (src/data/learnerProfile.ts, Settings > About you): missing when he has filled in nothing */
  learner_profile?: LearnerProfile;
  /** how he wants a language besides Greek written (src/script/depthSettings.ts) and how Ask the tutor opens: { hebrewDepth: 'both', askBy: 'speaking' } */
  settings?: Record<string, string>;
  /** the requests he sent to the factory and where each stands (src/data/requestsForTutor.ts): up to 10, newest first; missing when he has sent none */
  requests?: TutorRequest[];
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
}

export type AskByChange = { key: 'askBy'; value: 'speaking' | 'typing' };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

/** The change the app makes from an answer: the first entry, when it is Ask by set to Speaking or Typing (any case); anything else is ignored. */
export function askByChange(answer: VerseAnswer): AskByChange[] {
  const list = answer.settings_changes;
  const first = Array.isArray(list) ? (list[0] as unknown) : undefined;
  if (!isObject(first) || first.key !== 'askBy' || typeof first.value !== 'string') return [];
  const value = first.value.trim().toLowerCase();
  return value === 'speaking' || value === 'typing' ? [{ key: 'askBy', value }] : [];
}

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isVerseAnswer(value: unknown): value is VerseAnswer {
  if (!isObject(value) || Object.keys(value).some((k) => k !== 'answer' && k !== 'words' && k !== 'question' && k !== 'settings_changes') || !isText(value.answer, 1200)) return false;
  if ('question' in value && !isText(value.question, 400)) return false;
  if (!Array.isArray(value.words) || value.words.length > 12) return false;
  return value.words.every((w) => isObject(w) && Object.keys(w).length === 3 && isText(w.greek, 80) && isText(w.lemma, 80) && isText(w.note, 300));
}

export function buildRequest(reference: string, verse: Verse, question: string, solidWords: string[], learner?: string, learnerGrammar?: LearnerGrammar, settings?: Record<string, string>, requests: TutorRequest[] = [], learnerProfile?: LearnerProfile, spoken = false): VerseAskRequest {
  return {
    reference,
    greek: verse.g.map((w) => w.t).join(' '),
    english: verse.e.map(markSupplied).join(' '),
    question: question.trim(),
    ...(spoken ? { spoken: true as const } : {}),
    solid_words: solidWords,
    ...(learner ? { learner } : {}),
    ...(learnerGrammar ? { learner_grammar: learnerGrammar } : {}),
    ...(learnerProfile ? { learner_profile: learnerProfile } : {}),
    ...(settings ? { settings } : {}),
    ...(requests.length > 0 ? { requests } : {}),
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

export class TutorError extends Error {
  readonly failure: TutorFailure;
  constructor(failure: TutorFailure, message: string) {
    super(message);
    this.failure = failure;
    this.name = 'TutorError';
  }
}

/** The door's and the grist's failures in the words the Ask box shows. */
function explain(err: unknown): TutorError {
  if (err instanceof TutorError) return err;
  if (err instanceof door.RefusedError && err.message === door.LICENCE_REQUIRED) {
    return new TutorError('no-licence', 'This phone holds no Lampas licence the tutor accepts.');
  }
  if (err instanceof grist.GristInputError) return new TutorError('not-sent', err.message);
  if (err instanceof door.RefusedError) return new TutorError('unreachable', err.message);
  if (err instanceof door.ApiTimeoutError || err instanceof door.BackendUnreachableError) {
    return new TutorError('unreachable', 'Postern did not answer. Check the connection and try again.');
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
  files?: grist.GristFile[];
  baseUrl?: string;
}

/**
 * Sends `request` to the mill's grind `kind` and waits for its answer, which `isAnswer` must accept. Throws a TutorError:
 * no-licence, unreachable, not-sent (the grist was refused for its shape, nothing went out) or no-answer (the mill refused
 * or failed, or answered in a shape this app cannot use, or took past the deadline). The tutor and the Bible talk
 * (src/services/talk.ts) are two kinds sent this one way.
 */
export async function askGrind<Answer>(kind: string, request: object, isAnswer: (value: unknown) => value is Answer, options: AskOptions): Promise<Answer> {
  const { key } = options;
  const tapAt = options.tapAt ?? Date.now();
  const d = timedDoor(new door.Door({ baseUrl: options.baseUrl ?? POSTERN_DOOR, key }));
  const deadline = new AbortController();
  const stop = (): void => deadline.abort();
  options.signal?.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, tutorTimings.deadlineMs);
  // the timing of his previous answer rides with this grist (and is let go again if the grist never reaches the backend)
  const report = options.untimed ? undefined : claimReport();
  let sent = false;
  try {
    const { mill, events } = await meOf(d, deadline.signal);
    const { txid, seq } = await sendTimedGrist({ door: d, key, mill, app: TUTOR_APP, kind, v: TUTOR_VERSION, input: request, files: options.files ?? [], clientTiming: report });
    sent = true;
    const sentAt = Date.now();
    const sendNetwork = d.total;
    options.onSent?.(txid);
    const waited = await waitForAnswer(txid, seq, mill, d, key, deadline.signal, events ? { baseUrl: options.baseUrl ?? POSTERN_DOOR, key } : undefined);
    const reply = waited.answer;
    if (reply.status !== 'answered') {
      throw new TutorError('no-answer', reply.reason ? `The tutor could not answer: ${reply.reason}` : 'The tutor could not answer.');
    }
    if (!isAnswer(reply.answer)) throw new TutorError('no-answer', 'The tutor sent an answer this app could not read.');
    if (!options.untimed) noteAnswer(txid, { tapAt, sentAt, seenAt: waited.seenAt, deliveredAt: waited.deliveredAt, sendNetwork, pollNetwork: waited.pollNetwork });
    return reply.answer;
  } catch (err) {
    if (report && !sent) releaseReport(report.txid);
    if (err instanceof grist.AwaitAbortedError && !options.signal?.aborted) throw new TutorError('no-answer', 'The tutor took too long to answer.');
    throw explain(err);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', stop);
  }
}

/** Sends the question about a verse and waits for the answer (the verse-ask grind). */
export function askTutor(request: VerseAskRequest, options: AskOptions): Promise<VerseAnswer> {
  return askGrind(TUTOR_KIND, request, isVerseAnswer, options);
}
