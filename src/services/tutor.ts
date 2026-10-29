// src/services/tutor.ts — asking the tutor: a request sent as a grist through Postern (bsv-kit/grist)
// and answered by one of the mill's grinds (src/services/gristKinds.ts). All the wire work is bsv-kit's: the door signs
// every call with the device key, mill.ts sends (bsv-kit's sendGristRecord, with client_timing) and seals the request to the mill, waitForAnswer pages for the reply
// from the grist's own place in the backend's sequence.
import { door } from 'bsv-kit/bsv';
import { POSTERN_DOOR } from '../config';
import { MAX_QUESTION_CHARS } from './requestBudget';
import { claimReport, noteAnswer, releaseReport } from './clientTiming';
import { TALK_KINDS, type GristKind } from './gristKinds';
import { listenForAnswers, type StreamTarget } from './answerStream';
import { AwaitAbortedError, BackendStatusError, GristInputError, meOf, readTimedPage, SendUnknownError, sendTimedGrist, talkSessionOf, timedDoor, UploadTimeoutError, type MillAnswer, type MillFile, type Page, type Resend, type SentGrist, type TalkSession, type TimedDoor } from './mill';

/** The app the mill runs the grinds under. */
export const TUTOR_APP = 'lampas';
/** The version of every request the app sends. */
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

/** What the box says when a file's upload ran out of its time with the phone online: the link was too slow, nothing reached the tutor (mw-5r3p30.690). */
export const UPLOAD_TOO_SLOW_MESSAGE = 'That is taking too long to send. Check your connection and try again.';

const phoneIsOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

export class TutorError extends Error {
  readonly failure: TutorFailure;
  /** Set when the grist went out (or may have) and the link, not the mill, failed: the backend may hold it, and its answer may come.
   * Asking again with it as AskOptions.resend sends the same grist again, which finds the one the backend holds: never a second (mw-5r3p30.302). */
  readonly resend?: Resend;
  /** Set with `resend`: the id and place of the grist that went. Asking again with it as AskOptions.resume waits for the answer to that grist without sending anything,
   * and it can be kept across a reload, as a function cannot (mw-5r3p30.602). */
  readonly sent?: SentGrist;
  constructor(failure: TutorFailure, message: string, resend?: Resend, sent?: SentGrist) {
    super(message);
    this.failure = failure;
    this.name = 'TutorError';
    if (resend) this.resend = resend;
    if (sent) this.sent = sent;
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
function explain(err: unknown, uploadSlow?: string): TutorError {
  if (err instanceof TutorError) return err;
  if (err instanceof door.RefusedError && err.message === door.LICENCE_REQUIRED) {
    return new TutorError('no-licence', 'This phone holds no Lampas licence the tutor accepts.');
  }
  if (err instanceof GristInputError) return new TutorError('not-sent', err.message);
  if (err instanceof door.RefusedError) return new TutorError('unreachable', err.message);
  // the phone has no network only when the browser says so (mw-5r3p30.433): a call that failed before any response is no proof, since the gateway's
  // error page with no CORS headers, and a refused connection with the factory's home off, fail just as a lost network does (a TypeError)
  if (phoneIsOffline()) return new TutorError('unreachable', OFFLINE_MESSAGE);
  // a file that did not finish uploading on a slow link: the tutor never had it, and the tutor is not what is down
  if (err instanceof UploadTimeoutError) return new TutorError('unreachable', uploadSlow ?? UPLOAD_TOO_SLOW_MESSAGE);
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
  /** Called once the question has been sent and the wait for the answer begins, with the grist's id and place (what `resume` takes). The screen that draws the answer calls
   * answerDrawn(txid) (src/services/clientTiming.ts) once it has, which completes the answer's timing. */
  onSent?: (txid: string, seq: number) => void;
  /** Files sent with the grist: a recording of him reading (src/services/reading.ts). */
  files?: MillFile[];
  /** The resend of a failed ask (TutorError.resend): the same grist is sent again, so the answer to the one the backend may hold is waited for, and
   * no second grist is made; `request` and `files` are not sent. */
  resend?: Resend;
  /** A grist that has gone (TutorError.sent, or the id `onSent` was told, kept across a reload or a screen that went away): nothing is sent, the answer to it is waited for
   * (mw-5r3p30.602). `request` and `files` are not sent, and no timing is kept for it. */
  resume?: SentGrist;
  /** How long the answer is waited for before the question is given up on; default tutorTimings.deadlineMs. A reading grows it with the clip (services/reading.ts readingDeadlineMs). */
  deadlineMs?: number;
  /** How long the upload of a file may take, where the door's own 30 s is too little for the file (a long reading's clip, services/reading.ts uploadTimeoutMs). */
  uploadTimeoutMs?: number;
  /** What the box says when the deadline ends the wait, in place of 'The tutor is offline right now': for an ask whose mill has the grist and is still at it (a long reading). */
  tookTooLong?: string;
  /** What the box says when the upload of a file runs out of its time, in place of UPLOAD_TOO_SLOW_MESSAGE: for an ask that can name what was being sent (a reading). */
  uploadSlow?: string;
  /** The talk this ask is a turn of (src/services/talk.ts talkNameOf), named to the mill in the grist header so it keeps one session for it. Sent for the kinds that keep a talk (TALK_KINDS) alone: any other kind sends none. */
  talk?: string;
  /** Called with the `talk` block of the answer (what the mill says of the talk's session: fresh, resumed or refreshed, and the key points once) when the answer carries one in a shape this app reads. */
  onTalk?: (talk: TalkSession) => void;
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
  // a screen that went away before the send began sends nothing: its abort has already fired, and no listener would hear it now
  if (options.signal?.aborted) stop();
  const timer = setTimeout(stop, options.deadlineMs ?? tutorTimings.deadlineMs);
  // a file's upload may be given more than the door's 30 s: its own door, so the polls and the sign-in codes keep the short limit
  const uploadDoor = options.uploadTimeoutMs && options.uploadTimeoutMs > tutorTimings.doorTimeoutMs ? timedDoor(new door.Door({ baseUrl: options.baseUrl ?? POSTERN_DOOR, key, timeoutMs: options.uploadTimeoutMs })) : undefined;
  // the timing of his previous answer rides with this grist (and is let go again if the grist never reaches the backend)
  // a resend carries the timing its first sending did
  const report = options.untimed || options.resend || options.resume ? undefined : claimReport();
  // a resend is of a grist that may have gone: a failure before it is sent again still keeps it, so the next Retry makes no second one either
  let sent = options.resend !== undefined || options.resume !== undefined;
  // how to send this grist again, once it may have gone
  let resend = options.resend;
  // the grist that went, once it has: the failure carries it so that a Retry waits for its answer
  let went = options.resume;
  // the phone loses its network while the question waits: the wait ends then, not at the deadline (mw-5r3p30.434); only navigator.onLine says so
  let offline = false;
  const onOffline = (): void => {
    offline = true;
    deadline.abort();
  };
  if (typeof window !== 'undefined') window.addEventListener('offline', onOffline);
  try {
    const { mill, events } = await meOf(d, deadline.signal);
    const contactAt = Date.now();
    const send = async (): Promise<SentGrist> => {
      const grist = await sendTimedGrist({ door: d, uploadDoor, key, mill, app: TUTOR_APP, kind, v: TUTOR_VERSION, input: request, files: options.files ?? [], clientTiming: report, ...(options.talk && TALK_KINDS.includes(kind) ? { talk: options.talk } : {}) });
      resend = grist.resend;
      return grist;
    };
    const { txid, seq } =
      options.resume ??
      (await sendSurely(send, resend, d, deadline.signal, contactAt, (known) => {
        // it may have gone: its timing is not given back to ride on the next one
        sent = true;
        resend = known;
      }));
    sent = true;
    went = { txid, seq };
    const sentAt = Date.now();
    const sendNetwork = d.total + (uploadDoor?.total ?? 0);
    options.onSent?.(txid, seq);
    const waited = await waitForAnswer(txid, seq, mill, d, key, deadline.signal, events ? { baseUrl: options.baseUrl ?? POSTERN_DOOR, key } : undefined, sentAt);
    const reply = waited.answer;
    if (reply.status !== 'answered') {
      throw new TutorError('no-answer', reply.reason ? `The tutor could not answer: ${reply.reason}` : 'The tutor could not answer.');
    }
    if (!isAnswer(reply.answer)) throw new TutorError('no-answer', 'The tutor sent an answer this app could not read.');
    const session = talkSessionOf(reply.talk);
    if (session) options.onTalk?.(session);
    if (!options.untimed && !options.resume) noteAnswer(txid, { tapAt, sentAt, seenAt: waited.seenAt, deliveredAt: waited.deliveredAt, sendNetwork, pollNetwork: waited.pollNetwork });
    return reply.answer;
  } catch (err) {
    if (report && !sent) releaseReport(report.txid);
    // the wait ended with no answer: the phone's network going (the grist that went is for a Retry to find, not to send a second), or the deadline (a Retry asks again)
    if (err instanceof AwaitAbortedError && !options.signal?.aborted) {
      const tooLong = options.tookTooLong !== undefined && !offline && !phoneIsOffline();
      throw new TutorError('no-answer', tooLong ? options.tookTooLong! : phoneIsOffline() ? OFFLINE_MESSAGE : TUTOR_OFFLINE_MESSAGE, offline ? resend : undefined, offline ? went : undefined);
    }
    const failure = explain(err, options.uploadSlow);
    // the grist went (or may have) and the link failed: the backend may hold it, and Retry is to find it, not to send a second
    if (resend && sent && lostOnTheWay(err)) throw new TutorError(failure.failure, failure.message, resend, went);
    throw failure;
  } finally {
    if (typeof window !== 'undefined') window.removeEventListener('offline', onOffline);
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', stop);
  }
}
