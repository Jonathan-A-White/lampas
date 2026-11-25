// src/handsFree/ask.ts — Hands-free and the tutor (mw-rl10piw.8, his words on mw-6ww.165): 'ask who was Nicodemus' puts the question to the tutor as if he had held the bar and said it, in the talk of what is on
// screen (src/nav/tutorSeat.ts: the Reader answers, so it is the same talk and the same record; he finds the question and the answer in the Talk sheet when he is parked), says 'Asking the tutor' at once, and
// SPEAKS the answer though the Talk sheet is closed, in the voices a spoken answer uses (src/speech/readAloud.ts startAnswer, whatever Settings > Read the tutor's responses aloud says: he asked by voice).
// When the speaking ends the command resolves with followUp: the kit holds the microphone open 8 s with no wake word (voice-kit DEFAULT_FOLLOW_UP_MS), and a lower chime closes it. In that window the words of a
// command of the first set run that command (src/handsFree/commands.ts); any other words go to the tutor as the next turn of the same talk, so a conversation goes on turn after turn until he says 'stop',
// 'done' or 'close the tutor', or is silent.
//  - 'tutor' (or 'open the tutor', or 'ask' with no question) opens the Talk sheet on what is on screen through the tutor's one door (the floating ?'s own function) and listens.
//  - What the answer asks the app to do runs as it does for a typed question (useTalk): a free or undoable command, or a place; a command that needs his tap is not run, its offer waits in the Talk, and the words are still spoken.
//  - When the tutor cannot answer it says 'The tutor could not answer' and the reason the Talk shows, and the exchange closes. With no Reader on screen it says 'Open a chapter first'.
//  - A sermon the answer plays (the tutor's play-sermon, docs/sermons.md 'Play by asking') starts in the app's player when the speaking ends, with no tap.
//  - A wake while the answer is waited for (the kit's onInterrupt, `interruptAsk`) cuts the question short and opens a new command; the Talk keeps the turn. While the answer is spoken no
//    microphone is open (session.ts, mw-rl10piw.74), so the wake word is not heard then: a tap on Stop cuts it instead, and the exchange closes (no follow-up, no sermon it named).
import type { CommandDone } from 'voice-kit/handsfree';
import { tutorSeat } from '../nav/tutorSeat';
import { FAILURE_TITLES } from '../services/tutor';
import { answerRuns } from '../speech/answerRuns';
import { stopIfSpeaking } from '../speech/greek';
import { getReading, readingEndedWhole, stopReading, subscribeReading } from '../speech/readAloud';
import { startAnswerWhenSeen } from '../speech/tutorVoice';
import { dropQueuedSermon, playQueuedSermon } from '../sermons/player';
import { parkForAnswer, SAID_KEY } from './playback';
import { forgetVoiceTurns } from './voiceTurn';

/** What it says as the question goes. */
export const ASKING = 'Asking the tutor';

/** What it says when the tutor could not answer; the Talk's own reason follows it. */
export const TUTOR_FAILED = 'The tutor could not answer';

/** What it says when the tutor is open and waits for his question. */
export const TUTOR_LISTENING = 'Go ahead';

/** What it says when it was asked to open the tutor and cannot (no licence). */
export const NO_TUTOR = 'The tutor is not available';

/** What it says when the talk is still waiting for the answer to the last question. */
export const STILL_ANSWERING = 'The tutor is still answering your last question';

/** What it says as the tutor is put away. */
export const TUTOR_CLOSED = 'Tutor closed';

/** What it says on a screen with no Reader to ask in (commands.ts OPEN_A_CHAPTER's words). */
const OPEN_A_CHAPTER = 'Open a chapter first';

/** The question in words said as 'ask ...' or 'ask the tutor ...': what comes after those words, as he said it (capitals and punctuation kept). Empty when he said nothing more. */
export function questionAfterAsk(words: string): string {
  return words.trim().replace(/^(?:please[\s,]+)?ask(?:\s+the\s+tutor)?\b[\s,.:;!?-]*/i, '').trim();
}

/** The question being carried out: set while a command waits for the tutor or speaks its answer. */
interface Asking {
  cancelled: boolean;
  /** ends the wait for the answer's speech */
  stop?: () => void;
}
let asking: Asking | null = null;

/** The Talk sheet is open because Hands-free opened it ('tutor'): a command of the first set said in it puts it away; a sheet he opened himself is left. */
let openedByVoice = false;

/** Speaks the answer `id` (`answer`) in the voices of a spoken answer and resolves when it has been said, or cut by a wake (`stop`); a Stop he tapped (the speaking bar, the
 * answer's speaker) cuts it too (mine.cancelled), as a wake would: while the tutor speaks no microphone is open (session.ts, mw-rl10piw.74), so his tap is the way to cut it. */
function speakAnswer(id: number, answer: string, mine: Asking): Promise<void> {
  return new Promise((resolve) => {
    const runs = answerRuns(answer);
    let unwatch: (() => void) | null = null;
    const done = (): void => {
      unwatch?.();
      unwatch = null;
      mine.stop = undefined;
      resolve();
    };
    if (runs.length === 0) return done();
    mine.stop = done;
    unwatch = subscribeReading(() => {
      const reading = getReading();
      if (reading.answer === id) return;
      if (reading.status === 'idle' && !readingEndedWhole()) mine.cancelled = true;
      done();
    });
    startAnswerWhenSeen(id, runs);
    // the page was hidden and the answer waits for his return, or nothing could be spoken: nothing to wait for
    if (getReading().answer !== id) done();
  });
}

/** Whether a command was carried out by the tutor ('ask') and has not ended. */
export const isAsking = (): boolean => asking !== null;

/** A wake while the tutor's answer is waited for or spoken: the speaking stops and the question is no longer this command's (the Talk keeps the turn). True when there was one to interrupt. */
export function interruptAsk(): boolean {
  const mine = asking;
  if (!mine) return false;
  mine.cancelled = true;
  asking = null;
  mine.stop?.();
  stopIfSpeaking(SAID_KEY);
  if (getReading().answer !== null) stopReading();
  return true;
}

/** The tutor is put away if Hands-free opened it (the other commands call this before they run). */
export function leaveTutor(): void {
  if (!openedByVoice) return;
  openedByVoice = false;
  tutorSeat()?.close();
}

/** 'tutor': the Talk sheet opens on what is on screen and the microphone stays open for his question. */
export async function openTutor(say: (text: string) => Promise<void>): Promise<CommandDone | void> {
  const seat = tutorSeat();
  if (!seat) return say(OPEN_A_CHAPTER);
  const was = seat.isOpen();
  if (!seat.open()) return say(NO_TUTOR);
  openedByVoice = openedByVoice || !was;
  await say(TUTOR_LISTENING);
  return { followUp: true };
}

/** 'close the tutor' and 'done': the Talk sheet is put away if Hands-free opened it, and the exchange ends (the wake listens again). */
export async function closeTutor(say: (text: string) => Promise<void>): Promise<void> {
  const seat = tutorSeat();
  const was = openedByVoice || seat?.isOpen() === true;
  openedByVoice = false;
  seat?.close();
  if (was) await say(TUTOR_CLOSED);
}

/** 'ask ...', and any words in the follow-up window that are not a command (`announce` false: the next turn of a conversation is not announced): `question` goes to the tutor; its answer is spoken. */
export async function askTutor(question: string, say: (text: string) => Promise<void>, announce = true): Promise<CommandDone | void> {
  if (question === '') return openTutor(say);
  const seat = tutorSeat();
  if (!seat) return say(OPEN_A_CHAPTER);
  const mine: Asking = { cancelled: false };
  asking = mine;
  const finish = (): void => {
    if (asking === mine) asking = null;
  };
  // the chapter the wake paused is set aside, for the answer takes the voice; the close starts it again
  parkForAnswer();
  // a follow-up turn of the conversation is not announced again: the tutor is already the one he is talking to
  const said = announce ? say(ASKING) : Promise.resolve();
  const turn = seat.ask(question);
  // 'Asking the tutor' is said to its end before the answer takes the voice
  await said;
  if (!turn) {
    finish();
    return say(`${TUTOR_FAILED}: ${FAILURE_TITLES['no-licence']}`);
  }
  const outcome = await turn;
  if (mine.cancelled) {
    dropQueuedSermon();
    return;
  }
  if (outcome.kind === 'answered') {
    await speakAnswer(outcome.id, outcome.answer, mine);
    finish();
    // the sermon the answer named (play-sermon) starts as the answer ends, with no tap; a wake that cut the answer short leaves it
    if (mine.cancelled) dropQueuedSermon();
    else playQueuedSermon();
    return mine.cancelled ? undefined : { followUp: true };
  }
  finish();
  if (outcome.kind === 'failed') return say(`${TUTOR_FAILED}: ${FAILURE_TITLES[outcome.failure]}`);
  if (outcome.kind === 'busy') return say(STILL_ANSWERING);
}

/** Forgets the question and the sheet it opened (a session ended; tests). */
export function forgetAsk(): void {
  asking = null;
  openedByVoice = false;
  forgetVoiceTurns();
}
