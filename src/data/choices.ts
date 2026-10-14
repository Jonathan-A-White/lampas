// src/data/choices.ts — the wrong choices of every quiz in Lampas (mw-i7xe0n.7), pure. His words, of a Chi drill whose 'How is this word said?' set χάρις
// against other words: "the drill should catch whether I didn't really get that distinction and help me make that distinction". So a wrong choice is first a
// NEAR MISS of the point the item tests (the word misread by its sound rule, a look-alike letter, the same word in another case or tense, the other breathing,
// the twin with the other mark), and only then a filler of the same kind. A question keeps its near misses (GrammarQuestion.near), so a Hint takes the far
// ones away first (grammar/hint.ts). Every builder of choices uses choicesOf: grammar/drillItems.ts, grammar/quickRound.ts and grammar/questions.ts (the
// grammar questions), drill.ts (the Parsing drill) and quiz.ts (the Quick test); tests/unit/choices.test.ts holds each kind to a near miss where one exists.
import { shuffle, type Random } from './random';

/** Choices on a card: the right one and three wrong. */
export const OPTION_COUNT = 4;

export interface ChoiceSpec<T> {
  right: T;
  /** near misses of the point the item tests, the closest first; never shuffled, so a caller with several equally near shuffles them itself */
  near?: readonly T[];
  /** others of the same kind, to fill the places the near misses leave; shuffled */
  fillers?: readonly T[];
  /** taken in order only when the near misses and fillers are too few (a meaning that shares a word with the right one) */
  lastResort?: readonly T[];
  /** how many wrong choices: OPTION_COUNT - 1 */
  count?: number;
  /** what makes two the same choice, the text by default: two with one key are one choice, and none has the right one's */
  keyOf?: (choice: T) => string;
}

export interface Choices<T> {
  /** the right one and the wrong ones, shuffled */
  options: T[];
  /** the wrong ones that are near misses, the closest first */
  near: T[];
}

/** The wrong choices of an item: its near misses first, then fillers at random, then the last resort; none twice and none the right one. */
export function wrongChoices<T>(spec: ChoiceSpec<T>, random: Random): { wrong: T[]; near: T[] } {
  const keyOf = spec.keyOf ?? String;
  const count = spec.count ?? OPTION_COUNT - 1;
  const taken = new Set([keyOf(spec.right)]);
  const wrong: T[] = [];
  const take = (list: readonly T[]): void => {
    for (const choice of list) {
      if (wrong.length >= count) return;
      const key = keyOf(choice);
      if (taken.has(key)) continue;
      taken.add(key);
      wrong.push(choice);
    }
  };
  take(spec.near ?? []);
  const near = [...wrong];
  take(shuffle(spec.fillers ?? [], random));
  take(spec.lastResort ?? []);
  return { wrong, near };
}

/** The choices of an item, shuffled, with the near misses among them named. */
export function choicesOf<T>(spec: ChoiceSpec<T>, random: Random): Choices<T> {
  const { wrong, near } = wrongChoices(spec, random);
  return { options: shuffle([spec.right, ...wrong], random), near };
}

// ---- The near misses Lampas knows of, by kind ----

/** Letters a reader mistakes for each other, by ladder id: by look (ν for υ, ρ for p, η for n, χ for x, ο for ω) or by the sound of the look-alike (ρ and π). */
export const LOOK_ALIKE_LETTERS: readonly [string, string][] = [
  ['letter-nu', 'letter-upsilon'],
  ['letter-rho', 'letter-pi'],
  ['letter-eta', 'letter-nu'],
  ['letter-chi', 'letter-xi'],
  ['letter-omicron', 'letter-omega'],
];

/** The look-alikes of a letter, by ladder id. */
export const lookAlikesOf = (id: string): string[] => LOOK_ALIKE_LETTERS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));

/** Pairs one spelling rule makes alike, though they share no letter: a nasal and its stop (μπ, ντ, γκ). */
const PAIR_KIN: readonly (readonly string[])[] = [['μπ', 'ντ', 'γκ']];

/** The pairs of a group a reader mistakes for `pair` (αυ for ευ, γκ for γγ, μπ for ντ): those that share its second letter first, then its first, then its kin. */
export function pairMates(pair: string, pairs: readonly string[]): string[] {
  const others = pairs.filter((p) => p !== pair);
  const last = others.filter((p) => p.slice(-1) === pair.slice(-1));
  const first = others.filter((p) => !last.includes(p) && p[0] === pair[0]);
  const kin = others.filter((p) => !last.includes(p) && !first.includes(p) && PAIR_KIN.some((k) => k.includes(p) && k.includes(pair)));
  return [...last, ...first, ...kin];
}
