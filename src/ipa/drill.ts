// src/ipa/drill.ts — the questions of the course 'Learn the IPA sounds' and its drill (mw-5r3p30.356). Two kinds, both ways round: HEAR (the voice says a Greek word that
// starts with, or has, the sound; he picks its symbol) and SEE (the symbol is shown; he picks the key word that has the sound). A sound's confusable partners
// (src/speech/sounds.ts CONFUSABLE) are drilled together and offered among its choices. A wrong answer comes back soon and has to be right twice running. Pure: no screen, no store.
import { mulberry32, shuffle, type Random } from '../data/random';
import type { Pronunciation } from '../speech/pronunciation';
import { CONFUSABLE, type SoundId } from '../speech/sounds';
import type { CourseSound } from './course';

export type Direction = 'hear' | 'see';

export interface Choice {
  id: SoundId;
  /** what the button shows: the symbol for a HEAR question, the key word for a SEE one */
  label: string;
}

export interface IpaQuestion {
  sound: SoundId;
  direction: Direction;
  prompt: string;
  /** HEAR: the Greek word the voice says */
  say?: string;
  /** SEE: the symbol shown */
  symbol?: string;
  options: Choice[];
  right: SoundId;
}

/** How many choices a question has when the pool allows. */
export const CHOICES = 4;

/** The standard sounds `scheme` hears in `word`, which a HEAR question must not offer as wrong choices (they are in the word the voice says). */
function soundsHeard(word: string, scheme: Pronunciation): Set<SoundId> {
  return new Set((scheme.spellings?.(word) ?? []).map((u) => scheme.sounds[u.sound]).filter((id): id is SoundId => id !== undefined));
}

/** The question about `sound` in `direction`, its wrong choices drawn from `pool`: its confusable partners first, then others at random. */
export function buildQuestion(sound: SoundId, direction: Direction, pool: readonly SoundId[], random: Random, sounds: readonly CourseSound[], scheme: Pronunciation): IpaQuestion {
  const lesson = sounds.find((s) => s.id === sound);
  if (!lesson) throw new Error(`no lesson for ${sound}`);
  const heard = direction === 'hear' ? soundsHeard(lesson.word, scheme) : new Set<SoundId>();
  const others = pool.filter((id) => id !== sound && !heard.has(id));
  const partners = lesson.confusables.filter((id) => others.includes(id));
  const rest = shuffle(others.filter((id) => !partners.includes(id)), random);
  const wrong = [...shuffle(partners, random), ...rest].slice(0, CHOICES - 1);
  const label = (id: SoundId): string => (direction === 'hear' ? id : sounds.find((s) => s.id === id)!.choice);
  const options = shuffle([sound, ...wrong], random).map((id) => ({ id, label: label(id) }));
  return direction === 'hear'
    ? { sound, direction, prompt: lesson.at === 'start' ? 'Which sound does this word start with?' : 'Which of these sounds is in this word?', say: lesson.word, options, right: sound }
    : { sound, direction, prompt: 'Which word has this sound?', symbol: sound, options, right: sound };
}

export interface DrillItem {
  sound: SoundId;
  direction: Direction;
}

const keyOf = (item: DrillItem): string => `${item.sound}:${item.direction}`;

/** How many sounds a round holds before the partners the pool has for them are added. */
export const ROUND_SOUNDS = 6;

/** A round: the `size` weakest sounds of `pool` (`weakness` low is weak; ties in a shuffled order) and each one's confusable partners that are in the pool, every one asked
 * both ways, a sound and its partner next to each other in each way. */
export function drawRound(pool: readonly SoundId[], weakness: (id: SoundId) => number, random: Random, size: number = ROUND_SOUNDS, partnersOf: (id: SoundId) => readonly SoundId[] = defaultPartners): DrillItem[] {
  const ordered = shuffle(pool, random)
    .map((id, at) => ({ id, at }))
    .sort((a, b) => weakness(a.id) - weakness(b.id) || a.at - b.at)
    .map((x) => x.id);
  const chosen = new Set<SoundId>();
  const order: SoundId[] = [];
  for (const id of ordered.slice(0, size)) {
    for (const next of [id, ...partnersOf(id).filter((p) => pool.includes(p))]) {
      if (!chosen.has(next)) {
        chosen.add(next);
        order.push(next);
      }
    }
  }
  // each cluster (a sound with its partners) is asked in a row in one direction, then in the other
  const clusters: SoundId[][] = [];
  const placed = new Set<SoundId>();
  for (const id of order) {
    if (placed.has(id)) continue;
    const cluster = [id, ...partnersOf(id).filter((p) => chosen.has(p) && !placed.has(p) && p !== id)];
    cluster.forEach((c) => placed.add(c));
    clusters.push(cluster);
  }
  return clusters.flatMap((cluster) => (['hear', 'see'] as Direction[]).flatMap((direction) => cluster.map((sound) => ({ sound, direction }))));
}

const defaultPartners = (id: SoundId): readonly SoundId[] => CONFUSABLE[id] ?? [];

export interface DrillState {
  /** what is still to ask, the one being asked first */
  queue: DrillItem[];
  /** the items missed at least once in this round, as 'sound:direction' */
  missed: string[];
  /** for an item that was missed: how many times running it has been right since */
  runs: Record<string, number>;
  asked: number;
  rights: number;
}

/** A round to ask, its items in the order given. */
export const startRound = (items: readonly DrillItem[]): DrillState => ({ queue: [...items], missed: [], runs: {}, asked: 0, rights: 0 });

export const currentQuestion = (state: DrillState): DrillItem | undefined => state.queue[0];
export const isRoundOver = (state: DrillState): boolean => state.queue.length === 0;

/** How many questions later a missed item comes back. */
export const COMES_BACK_AFTER = 2;

/** An item right the first time it is asked leaves the round; one that was missed comes back after COMES_BACK_AFTER others and leaves once it is right twice running. */
export function answerDrill(state: DrillState, right: boolean): DrillState {
  const [item, ...rest] = state.queue;
  if (!item) return state;
  const key = keyOf(item);
  const next: DrillState = { ...state, queue: rest, asked: state.asked + 1, rights: state.rights + (right ? 1 : 0), runs: { ...state.runs } };
  const wasMissed = state.missed.includes(key);
  if (right && !wasMissed) return next;
  if (!right) {
    if (!wasMissed) next.missed = [...state.missed, key];
    next.runs[key] = 0;
  } else {
    next.runs[key] = (state.runs[key] ?? 0) + 1;
    if (next.runs[key] >= 2) return next;
  }
  const at = Math.min(COMES_BACK_AFTER, rest.length);
  next.queue = [...rest.slice(0, at), item, ...rest.slice(at)];
  return next;
}

/** The question for the item asked now, its choices drawn from `seed` and how many have been asked: a screen and a test that hold the same state build the same question. */
export function questionFor(item: DrillItem, asked: number, seed: number, pool: readonly SoundId[], sounds: readonly CourseSound[], scheme: Pronunciation): IpaQuestion {
  return buildQuestion(item.sound, item.direction, pool, mulberry32(seed * 1009 + asked), sounds, scheme);
}
