// src/talk/linkPromise.ts — an answer whose words promise a link it does not carry (mw-5r3p30.1248). His report: "Tap the link below to open it", and nothing below. The tutor
// is told to name a link only when `links` carries it (the answer schema's `answer`), and the app drops a slip as it drops a slipped goal offer (src/talk/quizGoalOffer.ts):
// with no link in the answer, each sentence that points him at a link, chip or button below is taken out of what is shown, kept and spoken; the rest stays as written.
import type { AnswerLink } from '../data/db';

/** A sentence that points at something drawn under the answer ('the link below', 'the button under this answer') or tells him to tap or follow a link or chip. */
const PROMISE = [/\b(?:links?|buttons?|chips?|tables?)\s+(?:below|under(?:neath)?)\b/i, /\b(?:tap|click|press|follow|use)\b[^.!?\n]*\b(?:links?|chips?)\b/i];

/** Whether the words point him at a link (a chip under the answer). */
export function promisesLink(words: string): boolean {
  return PROMISE.some((rule) => rule.test(words));
}

/** One line cut at its sentence ends: each sentence with the space before it. */
function sentencesOf(line: string): { space: string; text: string }[] {
  const parts = line.split(/(?<=[.!?]["'”’)]*)(\s+)/);
  const out: { space: string; text: string }[] = [{ space: '', text: parts[0] }];
  for (let i = 1; i < parts.length; i += 2) out.push({ space: parts[i], text: parts[i + 1] ?? '' });
  return out;
}

/**
 * The answer as shown: with no link (`links` missing or empty) the sentences that promise one are dropped, a line left empty goes with them, and the paragraphs and lines
 * of the rest stay. With a link it is the words as written (whether the chip is drawn is the chip's own business, src/TutorLinks.tsx). An answer that is nothing but
 * the promise is left as it is: an empty answer would say less than a wrong pointer.
 */
export function withoutUnkeptLinkPromise(answer: string, links: AnswerLink[] | undefined): string {
  if ((links?.length ?? 0) > 0 || !promisesLink(answer)) return answer;
  const lines: string[] = [];
  for (const line of answer.split('\n')) {
    if (!promisesLink(line)) {
      lines.push(line);
      continue;
    }
    const kept = sentencesOf(line).filter((s) => !promisesLink(s.text));
    const text = kept.map((s, i) => (i === 0 ? s.text : s.space + s.text)).join('').trimEnd();
    // a line that was only the promise (or a list item of it) goes with it
    if (text.trim() !== '' && !/^\s*(?:[-*+]|\d+[.)])\s*$/.test(text)) lines.push(text);
  }
  const shown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return shown === '' ? answer : shown;
}
