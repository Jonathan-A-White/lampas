// src/data/grammar/quickRound.ts — the quick round of the placement (mw-hqd5bz.18), pure: when the walk has reached the letters, sounds and marks, one tap
// on each letter, diphthong, consonant pair and breathing that is not solid yet. PROVISIONAL, the Mayor's rules, the Governor to confirm:
//   'Hear and pick': the app says the letter or pair and he taps it; 'See and pick': it shows the letter or pair and he taps its sound (a breathing is
//   only seen: Modern Greek does not say it). One tap an item, right = solid, wrong = not yet, each its own level (how 'placement').
//   At most QUICK_LIMIT (40) taps, outside the 20 questions of the walk; Stop here keeps what was answered. Items he claimed whole ('I know this' on the
//   alphabet) are not asked. Nothing here touches the store or the screen; questions.ts shapes are reused so the card is the Review card.
import { shuffle, type Random } from '../quiz';
import { ITEM_GROUPS, ideaOf, itemsOf, type GrammarIdea } from './ladder';
import type { Level } from './needs';
import type { GrammarQuestion } from './questions';

/** Taps in one quick round: the 24 letters, 8 diphthongs, 6 consonant pairs and 2 breathings. PROVISIONAL. */
export const QUICK_LIMIT = 40;

export type QuickMode = 'hear' | 'see';

export interface QuickItem {
  /** the ladder id of the letter or combination */
  id: string;
  mode: QuickMode;
}

export interface QuickAnswer {
  id: string;
  right: boolean;
}

export interface QuickRound {
  items: QuickItem[];
  /** the index in `items` of the item being asked */
  at: number;
  answers: QuickAnswer[];
  /** he tapped Stop here */
  stopped: boolean;
  /** the questions' seed */
  seed: number;
}

const OPTION_COUNT = 4;

/**
 * The letters and combinations to ask: every one that is not solid, in the ladder's order, at most QUICK_LIMIT. A group in `claimed` (he said he knows it
 * whole) is passed over. Modes alternate, from the seed, 'hear' and 'see'; a breathing is always seen.
 */
export function quickItems(levels: ReadonlyMap<string, Level>, seed: number, claimed: ReadonlySet<string> = new Set()): QuickItem[] {
  const weak = ITEM_GROUPS.filter((group) => !claimed.has(group)).flatMap((group) => itemsOf(group).filter((i) => levels.get(i.id) !== 'solid'));
  return weak.slice(0, QUICK_LIMIT).map((idea, n) => ({ id: idea.id, mode: idea.parent === 'breathings' || (n + seed) % 2 === 1 ? 'see' : 'hear' }));
}

/** A quick round over what is not solid; null when nothing is left to ask. */
export function startQuick(levels: ReadonlyMap<string, Level>, seed: number, claimed: ReadonlySet<string> = new Set()): QuickRound | null {
  const items = quickItems(levels, seed, claimed);
  return items.length === 0 ? null : { items, at: 0, answers: [], stopped: false, seed: seed >>> 0 };
}

/** True when the round has nothing more to ask: every item answered, or he stopped. */
export const quickOver = (round: QuickRound): boolean => round.stopped || round.at >= round.items.length;

/** The item being asked, or null once the round is over. */
export const currentQuick = (round: QuickRound): QuickItem | null => (quickOver(round) ? null : round.items[round.at]);

/** One tap on the item being asked. A round that is over does not change. */
export function answerQuick(round: QuickRound, right: boolean): QuickRound {
  const item = currentQuick(round);
  if (!item) return round;
  return { ...round, at: round.at + 1, answers: [...round.answers, { id: item.id, right }] };
}

/** Stop here: what was answered is kept, the rest is not asked. */
export const stopQuick = (round: QuickRound): QuickRound => (quickOver(round) ? round : { ...round, stopped: true });

/** The seed of the question being asked: the same round gives the same question. */
export const quickSeed = (round: QuickRound): number => (round.seed + round.at * 7919) >>> 0;

/** The part of a sound before its first semicolon: 'gh, a soft throaty g; before e and i it is y' -> 'gh, a soft throaty g'. */
export const shortSound = (sound: string): string => sound.split(';')[0].trim();

const glyphOf = (idea: GrammarIdea): string => idea.glyphs?.[0] ?? idea.pair ?? '';

const SAMPLES: Record<'Rough' | 'Smooth', string[]> = { Rough: ['ὁ', 'ἡ', 'ὅς', 'ἅγιος', 'ὑπέρ'], Smooth: ['ἐν', 'ἀπό', 'ἐγώ', 'ἄνθρωπος', 'ἀγάπη'] };

/** The question for one item: hear it and pick the letter or pair; see it and pick its sound; see a word and pick its breathing. */
export function quickQuestion(item: QuickItem, random: Random): GrammarQuestion {
  const idea = ideaOf(item.id);
  if (idea.parent === 'breathings') {
    const breathing = idea.id === 'breathing-rough' ? 'Rough' : 'Smooth';
    const samples = SAMPLES[breathing];
    const word = samples[Math.floor(random() * samples.length)];
    return { kind: 'breathing', ideaId: idea.id, prompt: 'Which breathing does this word begin with?', options: ['Rough', 'Smooth'], right: breathing, form: word };
  }
  const same = itemsOf(idea.parent ?? 'alphabet');
  const sound = shortSound(idea.sound ?? '');
  // the others of its group that sound different, so only one answer is right
  const others = same.filter((o) => o.id !== idea.id && shortSound(o.sound ?? '') !== sound);
  if (item.mode === 'hear') {
    return {
      kind: 'sound',
      ideaId: idea.id,
      prompt: 'Hear it, then tap it',
      options: shuffle([glyphOf(idea), ...shuffle(others, random).slice(0, OPTION_COUNT - 1).map(glyphOf)], random),
      right: glyphOf(idea),
      say: glyphOf(idea),
    };
  }
  const sounds = [...new Set(others.map((o) => shortSound(o.sound ?? '')))];
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: 'What sound does it make?',
    options: shuffle([sound, ...shuffle(sounds, random).slice(0, OPTION_COUNT - 1)], random),
    right: sound,
    form: glyphOf(idea),
  };
}

/** How the round stands: '7 of 31', the item being asked. */
export const quickProgress = (round: QuickRound): string => `${Math.min(round.at + 1, round.items.length)} of ${round.items.length}`;
