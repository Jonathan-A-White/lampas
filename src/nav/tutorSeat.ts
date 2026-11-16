// src/nav/tutorSeat.ts — the Reader on screen answers Hands-free's tutor commands (mw-rl10piw.8), as it answers 'read from here' (src/nav/readerRequest.ts answerReadHere): 'ask ...' puts a question to
// the tutor in the talk of what is on screen, 'tutor' opens the Talk sheet there as the floating ? does, 'close the tutor' puts it away. Hands-free (src/handsFree/ask.ts) reaches the Reader only through
// this seat, so no second talk is made and the Reader's own context (the passage or verse on screen, the open word) is the one every tutor entry uses.
import type { VoiceOutcome } from '../handsFree/voiceTurn';

export interface TutorSeat {
  book: string;
  chapter: number;
  /** Puts `question` to the tutor as the next turn of the talk of what is on screen (the Talk sheet's talk when it is open), as if he had held the bar and said it; the sheet need not be open.
   * Resolves with what became of the turn. Null when the tutor cannot be asked here (no licence, the chapter not drawn yet). */
  ask(question: string): Promise<VoiceOutcome> | null;
  /** Whether the Talk sheet is open now. */
  isOpen(): boolean;
  /** Opens the Talk sheet on what is on screen, through the tutor's one door (src/tutor/door.ts openDoorTarget). True when it opened. */
  open(): boolean;
  /** Puts the Talk sheet away. True when one was open. */
  close(): boolean;
}

const seats: TutorSeat[] = [];

/** The Reader of `seat.chapter` is on screen and answers the tutor commands; the function returned takes it off. */
export function answerTutor(seat: TutorSeat): () => void {
  seats.push(seat);
  return () => {
    const at = seats.lastIndexOf(seat);
    if (at >= 0) seats.splice(at, 1);
  };
}

/** The Reader on screen, or null when none is open. */
export const tutorSeat = (): TutorSeat | null => seats[seats.length - 1] ?? null;
