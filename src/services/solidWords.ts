// What the tutor is told of his solid words (mw-5r3p30.344): how many there are and the most recent few. The whole list grew with the learner
// until the request was over the grist's record cap; the tutor needs the count to know how far along he is, and the newest words to pitch an answer.

/** The most solid words a request names. */
export const SOLID_WORDS_SENT = 50;

/** `words` is his solid words oldest first (data/repositories/words.ts listSolidHeadwords): the field is their count and the last SOLID_WORDS_SENT of them. */
export function solidWordsField(words: string[]): { solid_count: number; solid_words: string[] } {
  return { solid_count: words.length, solid_words: words.slice(-SOLID_WORDS_SENT) };
}
