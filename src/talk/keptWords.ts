// src/talk/keptWords.ts — where the words of a hold that did not end in a release go (mw-06ggew.15): voice-kit hands on what he said so far on every end of a hold
// (a slide off, the phone taking the touch, the recogniser failing or ending by itself, the app hidden), and that is his to send, not to lose. The open Talk sheet
// registers how it takes them into its field; a hold of the Talk bar opens the sheet as it begins, so it is there when the words come. Words that
// come with no sheet open wait for the next one.
let keeper: ((words: string) => void) | null = null;
let waiting: string[] = [];

/** The open sheet says how it puts kept words in its field; the words that waited go in at once. Returns what takes it back. */
export function registerKeeper(take: (words: string) => void): () => void {
  keeper = take;
  const stashed = waiting;
  waiting = [];
  for (const words of stashed) take(words);
  return () => {
    if (keeper === take) keeper = null;
  };
}

/** Words he said that are not to be sent: into the open sheet's field, or kept for the next sheet. */
export function keepWords(words: string): void {
  if (!words.trim()) return;
  if (keeper) keeper(words);
  else waiting.push(words);
}
