// src/services/fillers.ts — a guard on the tutor's cleaned question (mw-5r3p30.193). The grind is told to take out his ums and uhs, but a model sometimes
// keeps them; what he sees in the Ask card's question line never carries a lone um, uh or er, whatever it returns.

/** A whole word that is a filler: not Uh-oh, not an apostrophe word, not umbrella. Trailing punctuation is the word's own. */
const FILLER = /^(?:um|uh|er)([,.;:!?…]*)$/i;
const SENTENCE_END = /[.!?…]$/;

/**
 * The question without its lone um, uh and er, the commas around them gone and a new first letter of a sentence capitalised.
 * Every other word is left as it was. A question that is only fillers is given back as it came.
 */
export function withoutFillers(question: string): string {
  const words = question.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  let capitalise = false;
  let dropped = false;
  for (const word of words) {
    const match = FILLER.exec(word);
    if (!match) {
      const first = kept.length === 0;
      kept.push(capitalise && /^[a-z]/.test(word) && (first || SENTENCE_END.test(kept[kept.length - 1])) ? word[0].toUpperCase() + word.slice(1) : word);
      capitalise = false;
      continue;
    }
    dropped = true;
    // the commas around the filler go with it; a mark that ends a sentence stays, on the word before
    const end = match[1].match(/[.!?…]+$/)?.[0] ?? '';
    const before = kept.length - 1;
    if (before >= 0) kept[before] = kept[before].replace(/[,;:]+$/, '') + end;
    if (kept.length === 0 || SENTENCE_END.test(kept[before] ?? '')) capitalise = true;
  }
  if (!dropped || kept.length === 0) return question;
  return kept.join(' ');
}
