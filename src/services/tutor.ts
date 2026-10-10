// src/services/tutor.ts — the tutor: one question about a verse, sent as a grist through Postern (bsv-kit/grist)
// and answered by the mill's verse-ask grind (grinds/verse-ask.json). All the wire work is bsv-kit's: the door signs
// every call with the device key, sendGrist seals the request to the mill, awaitAnswer pages for the reply.
import { door } from 'bsv-kit/bsv';
import { grist } from 'bsv-kit/grist';
import { POSTERN_DOOR } from '../config';
import { markSupplied, type Verse } from '../data/chapter';
import type { AnswerWord } from '../data/db';
import type { LearnerGrammar } from '../data/grammar/learnerGrammar';

/** The app and kind the mill runs the grind under (grinds/verse-ask.json), and the version of the request below. */
export const TUTOR_APP = 'lampas';
export const TUTOR_KIND = 'verse-ask';
export const TUTOR_VERSION = '1';

/** How long a question may be: a grist's record is capped at 10 KiB and Greek letters take two bytes each. */
export const MAX_QUESTION_CHARS = 400;

/** The timings, in one object so a test may shorten them. */
export const tutorTimings = {
  /** How often the mill is asked whether it has answered. */
  pollMs: 3000,
  /** How long it has to answer before the question is given up on. */
  deadlineMs: 180_000,
};

/** What the grind is sent (Verse Ask Request 1): the verse in both languages, his words, his question. */
export interface VerseAskRequest {
  reference: string;
  greek: string;
  english: string;
  question: string;
  solid_words: string[];
  /** where he stands (src/data/learnerSummary.ts): solid count, the learning words, today's new words, what is due */
  learner?: string;
  /** where his grammar stands (src/data/grammar/learnerGrammar.ts) */
  learner_grammar?: LearnerGrammar;
  /** how he wants a language besides Greek written (src/script/depthSettings.ts): { hebrewDepth: 'both' } */
  settings?: Record<string, string>;
}

/** What the grind answers (grinds/verse-ask.answer.schema.json). */
export interface VerseAnswer {
  answer: string;
  words: AnswerWord[];
  /** what he asked, cleaned up by the tutor (punctuation, capitals, no fillers); shown in place of his raw words when present */
  question?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isVerseAnswer(value: unknown): value is VerseAnswer {
  if (!isObject(value) || Object.keys(value).some((k) => k !== 'answer' && k !== 'words' && k !== 'question') || !isText(value.answer, 1200)) return false;
  if ('question' in value && !isText(value.question, 400)) return false;
  if (!Array.isArray(value.words) || value.words.length > 12) return false;
  return value.words.every((w) => isObject(w) && Object.keys(w).length === 3 && isText(w.greek, 80) && isText(w.lemma, 80) && isText(w.note, 300));
}

export function buildRequest(reference: string, verse: Verse, question: string, solidWords: string[], learner?: string, learnerGrammar?: LearnerGrammar, settings?: Record<string, string>): VerseAskRequest {
  return {
    reference,
    greek: verse.g.map((w) => w.t).join(' '),
    english: verse.e.map(markSupplied).join(' '),
    question: question.trim(),
    solid_words: solidWords,
    ...(learner ? { learner } : {}),
    ...(learnerGrammar ? { learner_grammar: learnerGrammar } : {}),
    ...(settings ? { settings } : {}),
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
  /** Called once the question has been sent and the wait for the answer begins. */
  onSent?: () => void;
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
  const d = new door.Door({ baseUrl: options.baseUrl ?? POSTERN_DOOR, key });
  const deadline = new AbortController();
  const stop = (): void => deadline.abort();
  options.signal?.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, tutorTimings.deadlineMs);
  try {
    const txid = await grist.sendGrist({ door: d, key, app: TUTOR_APP, kind, v: TUTOR_VERSION, input: request, photos: [], attachments: options.files });
    options.onSent?.();
    const reply = await grist.awaitAnswer(txid, { door: d, key, intervalMs: tutorTimings.pollMs, signal: deadline.signal });
    if (reply.status !== 'answered') {
      throw new TutorError('no-answer', reply.reason ? `The tutor could not answer: ${reply.reason}` : 'The tutor could not answer.');
    }
    if (!isAnswer(reply.answer)) throw new TutorError('no-answer', 'The tutor sent an answer this app could not read.');
    return reply.answer;
  } catch (err) {
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
