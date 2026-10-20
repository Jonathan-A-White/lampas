// src/data/grammar/ruleWord.ts — the question about a pair whose sound changes by position (mw-5r3p30.646, his words: 'make sure that distinction is really drilled'), pure.
// αυ, ευ, ηυ are v or f by the next letter, μπ, ντ, γκ are b, d, g at the start of a word and mb, nd, ng inside it, γχ is hard or soft: the pair alone has no one sound, so it
// is never asked alone (a bare γκ marked 'ng, as in finger' wrong, though ἀνάγκη says it). The question shows a REAL word with the pair marked and asks its sound in that
// word; the right answer is the label of the side of the scheme's rule the word stands on (speech/pronunciation.ts SoundRule), the same line the sheet teaches.
import type { Random } from '../quiz';
import { choicesOf } from '../choices';
import type { Pronunciation, SoundRule, SoundRuleSide } from '../../speech/pronunciation';
import { itemFacet, itemsOf, type GrammarIdea } from './ladder';
import { ideaChoice } from './lessons';
import type { GrammarQuestion } from './questions';

const baseOf = (c: string): string => c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');

/** Where the letters of `pair` stand in `word` as indexes into the word as written (marks and all): the first place they are, or null. */
export function pairSpan(word: string, pair: string): [number, number] | null {
  const letters = [...word.normalize('NFC')];
  const bases = letters.map(baseOf);
  const target = [...baseOf(pair)];
  for (let i = 0; i + target.length <= letters.length; i += 1) {
    if (target.every((c, k) => bases[i + k] === c)) {
      const from = letters.slice(0, i).join('').length;
      return [from, from + letters.slice(i, i + target.length).join('').length];
    }
  }
  return null;
}

/** The rule that makes the sound of this pair depend on its place, when the scheme has one and the scheme says the pair's sound at all. */
export const positionRule = (idea: GrammarIdea, rule: SoundRule | undefined): SoundRule | undefined => (idea.pair && rule?.sides.length ? rule : undefined);

/**
 * 'What sound does the marked ευ make in this word?' for a word of one side of the pair's rule: the sound there is right, the other side's is the near miss (εὐθύς is
 * ef, and ev is what a reader who has not got the rule says), and the others are the sounds of the group's other pairs.
 */
export function ruleWordQuestion(idea: GrammarIdea, rule: SoundRule, side: SoundRuleSide, word: string, random: Random, scheme: Pronunciation): GrammarQuestion | null {
  const pair = idea.pair;
  const span = pair ? pairSpan(word, pair) : null;
  if (!pair || !span) return null;
  const others = rule.sides.filter((s) => s !== side);
  const fillers = itemsOf(idea.parent ?? 'diphthongs')
    .filter((o) => o.id !== idea.id)
    .flatMap((o) => ideaChoice(o, scheme) ?? []);
  const { options, near } = choicesOf({ right: side.choice, near: others.map((s) => s.choice), fillers }, random);
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: `What sound does the marked ${pair} make in this word?`,
    options,
    near,
    right: side.choice,
    form: word.normalize('NFC'),
    span,
    say: word,
    rule: side.line,
    facet: itemFacet(idea),
  };
}
