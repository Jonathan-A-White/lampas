// src/handsFree/voiceTurn.ts — the turn of a Bible talk that Hands-free asked by voice (mw-rl10piw.8): 'ask who was Nicodemus' puts a question to the tutor through the Reader's talk (src/useTalk.ts say),
// and the command waits here for what became of that turn. useTalk tells it when the answer is kept (and the answer is then the command's to speak, not the Talk sheet's), when the turn failed (the
// Talk's own reason) and when the screen went away. One turn waits for each conversation (its ref); a second question into the same conversation drops the first (it ends 'gone').
import type { TutorFailure } from '../services/tutor';

/** What became of the turn: the answer kept (its stored turn's id and its words), the way it failed, a talk already waiting for an answer, or the screen that asked going away. */
export type VoiceOutcome =
  | { kind: 'answered'; id: number; answer: string }
  | { kind: 'failed'; failure: TutorFailure; detail: string }
  | { kind: 'busy' }
  | { kind: 'gone' };

const waiting = new Map<string, (outcome: VoiceOutcome) => void>();

/** The turn of the conversation `ref` is about to be sent: resolves with what becomes of it. Call it before the message is sent. */
export function expectVoiceTurn(ref: string): Promise<VoiceOutcome> {
  waiting.get(ref)?.({ kind: 'gone' });
  return new Promise((resolve) => waiting.set(ref, resolve));
}

/** Whether a turn of this conversation was asked by voice and has not ended. */
export const voiceTurnWaits = (ref: string): boolean => waiting.has(ref);

/** The turn of `ref` has ended as `outcome`. True when a voice command was waiting for it (the turn is then its to speak). */
export function tellVoiceTurn(ref: string, outcome: VoiceOutcome): boolean {
  const resolve = waiting.get(ref);
  if (!resolve) return false;
  waiting.delete(ref);
  resolve(outcome);
  return true;
}

/** Nobody waits for the turn of `ref` any more (the command was interrupted): what comes of it stays in the Talk. */
export function dropVoiceTurn(ref: string): void {
  tellVoiceTurn(ref, { kind: 'gone' });
}

/** Ends every waiting turn as gone (the session ended; tests). */
export function forgetVoiceTurns(): void {
  for (const ref of [...waiting.keys()]) dropVoiceTurn(ref);
}
