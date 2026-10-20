// src/speech/spoken.ts — which words reached the tutor by voice (mw-5r3p30.244). Hold to talk and Hold to ask use the phone's recogniser in
// en-US, so a Greek word he says comes back as English sound-alikes. The words a recogniser handed over are remembered here (the newest
// only), and a question whose text is those words is sent marked `spoken: true`, so the tutor knows to hear through the sound-alikes. A
// question he typed, or edited after speaking it, is not these words, and once they are sent they are forgotten (mw-5r3p30.333): the same words
// typed afterwards are his typing. Retry sends the same text again; the failed ask keeps `spoken` (AskState) for it.

let heard = '';

const normal = (text: string): string => text.trim().replace(/\s+/g, ' ');

/** Remembers the words the recogniser gave for a hold. */
export function noteSpoken(text: string): void {
  heard = normal(text);
}

/** True when `question` is exactly the words the recogniser last gave, and then they are forgotten: this is asked once, as the question is sent. Other words leave them kept. */
export function wasSpoken(question: string): boolean {
  if (heard === '' || normal(question) !== heard) return false;
  heard = '';
  return true;
}

/** Forgets the words (for a test between scenarios). */
export function forgetSpoken(): void {
  heard = '';
}
