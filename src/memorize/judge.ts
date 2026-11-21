// src/memorize/judge.ts — judging a recall of a verse (docs/layout/memorize.md): what he said, typed or read into a recording against the target's token sequence
// (src/memorize/target.ts). Pure. A recall passes at 90% of the target's words heard in order, extras ignored, and every missed word is marked by its token's
// index, so the screen can show where and the record can keep it. Words are compared as learn-kit/recall folds them (accents, breathings, case, final sigma and
// punctuation off) and in their own language: a token asked in Greek that is answered with its English is a miss, because the matcher is given the token's own text
// (what his Q9 of mw-6ww.137 asks: a word learned in Greek, missed in the Weave, is flagged, never pinned).
import { foldWords, matchSequence, type Match } from 'learn-kit/recall';
import { wordsOfText, type VerseReadAnswer } from '../services/reading';
import type { Token } from './target';

/** The share of tokens a reading the mill marked 'some-to-fix' may have to fix and still pass: a tenth. */
export const READING_FIX_SHARE = 0.1;

/** A token as asked of him: the word and the language it was asked in (what recordRecall keeps as `asked`). */
export interface Asked {
  text: string;
  lang: Token['lang'];
}

/** How a recall went. `misses` are indexes into the target's tokens; `heardWords` the folded words heard (empty when the mill, not the phone, heard him). */
export interface Judgement {
  /** the share of the target's words heard, 0 to 1 */
  score: number;
  passed: boolean;
  misses: number[];
  heardWords: string[];
  /** for each missed token (by index), the words said where it stood, as he said them; [] when nothing was said there. Absent when the phone did not hear him
   *  (the mill's reading, his own grade) and in a judgement made before it was kept: the screen then has nothing heard to show. */
  heardAt?: Record<number, string[]>;
  /** every token of the target with the language it was asked in */
  asked: Asked[];
}

/** The target as it was asked: each token's text and language, no more. */
export const asked = (target: readonly Token[]): Asked[] => target.map(({ text, lang }) => ({ text, lang }));

/** A Hebrew final letter (ך ם ן ף ץ) and its medial form (כ מ נ פ צ) are the one letter: a phone's dictation or a keyboard may give either. */
const FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** A maqaf joins two Hebrew words: typed with no space round it, it still ends a word. */
const MAQAF = /\u05BE/gu;
const unfinal = (text: string): string => text.replace(/[ךםןףץ]/gu, (c) => FINALS[c]);

/** A said or typed recall against the target. A token that folds to nothing (a lone dash) is not a word to say, so it is neither asked nor missed. A Hebrew word is compared by its
 *  consonants alone (learn-kit's fold takes off every mark: the points, the cantillation, the dots of shin and sin; PROVISIONAL), a final letter as its medial form. */
function judgeWords(target: readonly Token[], heard: string): Judgement {
  const spoken = heard.replace(MAQAF, ' ').split(/\s+/).filter((w) => foldWords(w).length > 0);
  const heardWords = foldWords(heard.replace(MAQAF, ' ')).map(unfinal);
  const places = target.flatMap((t, i) => (foldWords(t.text).length > 0 ? [i] : []));
  const match = matchSequence(places.map((i) => unfinal(target[i].text)), heardWords);
  return { score: match.score, passed: match.passed, misses: match.misses.map((m) => places[m]), heardWords, heardAt: heardAt(match, places, spoken.map(trimmed)), asked: asked(target) };
}

/** A said word with the marks round it (a comma, a quote) taken off, its letters left as he said them. */
const trimmed = (word: string): string => word.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, '');

/**
 * Which said words stood where a missed word should have been. The words said are the target's hits in order and the extras between them; the extras in the gap between
 * two hits go to the missed words in that gap, one each in order, any left over to the last of them, and a missed word with none says nothing was heard there.
 * `match` indexes `places` (the tokens that have a word), `said` the words in the order they were said.
 */
function heardAt(match: Match, places: readonly number[], said: readonly string[]): Record<number, string[]> {
  const extras = new Set(match.extras);
  const used = said.map((_, k) => k).filter((k) => !extras.has(k)); // the said word each hit used, hits in order
  const at: Record<number, string[]> = {};
  let hit = -1; // the last hit passed: its said word is used[hit]
  let gap: number[] = []; // the target's missed places since it
  const settle = (until: number): void => {
    const from = hit < 0 ? -1 : used[hit];
    const words = match.extras.filter((k) => k > from && k < until).map((k) => said[k]);
    gap.forEach((m, n) => {
      at[places[m]] = n < gap.length - 1 ? words.slice(n, n + 1) : words.slice(n);
    });
    gap = [];
  };
  const hits = new Set(match.hits);
  for (let t = 0; t < match.misses.length + match.hits.length; t++) {
    if (hits.has(t)) {
      settle(used[hit + 1]);
      hit++;
    } else gap.push(t);
  }
  settle(said.length);
  return at;
}

/** What he said (the phone's dictation, in the language of the target) against the target's tokens. */
export const judgeSaid = (target: readonly Token[], heard: string): Judgement => judgeWords(target, heard);

/** What he typed against the target's tokens: the same rule, so accents, breathings, case, punctuation and a final sigma are ignored. */
export const judgeTyped = (target: readonly Token[], typed: string): Judgement => judgeWords(target, typed);

/**
 * A Weave recall sent to the mill's verse-read grind, read as a judgement. well-read passes with nothing missed; some-to-fix marks each focus word's token (its
 * `index` counts the words of the reading text, wordsOfText, which a token of more than one word spans) and passes while no more than a tenth of the tokens are
 * marked; partial marks every token past `reached` (and the focus words before it) and fails; incomplete misses every token and fails.
 */
export function judgeReading(target: readonly Token[], answer: VerseReadAnswer): Judgement {
  const all = target.map((_, i) => i);
  const first: number[] = []; // the place in the reading text of each token's first word
  const owner: number[] = []; // the token each word of the reading text belongs to
  target.forEach((t, i) => {
    first.push(owner.length);
    owner.push(...wordsOfText(t.text).map(() => i));
  });
  const result = (misses: number[], passed: boolean): Judgement => {
    const missed = [...new Set(misses)].sort((a, b) => a - b);
    return { score: target.length === 0 ? 1 : 1 - missed.length / target.length, passed, misses: missed, heardWords: [], asked: asked(target) };
  };
  if (answer.verdict === 'well-read') return result([], true);
  if (answer.verdict === 'incomplete') return result(all, false);
  const fixed = answer.focus_words.flatMap((f) => (owner[f.index] === undefined ? [] : [owner[f.index]]));
  if (answer.verdict === 'partial') {
    const reached = answer.reached ?? -1;
    return result([...fixed.filter((i) => first[i] <= reached), ...all.filter((i) => first[i] > reached)], false);
  }
  const misses = result(fixed, false).misses;
  return result(misses, misses.length <= target.length * READING_FIX_SHARE + 1e-9);
}
