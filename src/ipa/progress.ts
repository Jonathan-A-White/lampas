// src/ipa/progress.ts — what the course 'Learn the IPA sounds' keeps on the device (mw-5r3p30.356), like his other lessons: whether he has begun it (met the
// 'Why learn it?' card and tapped Start), the sounds whose card he has opened, a running count of answers right in a row for each sound each way, and when he passed the
// check. One value, saved as text under one settings key (src/data/repositories/ipaCourse.ts). The sounds are the standard's (src/speech/sounds.ts), so the progress
// belongs to no Greek pronunciation. Pure.
import { SOUND_IDS, type SoundId } from '../speech/sounds';
import type { Direction } from './drill';

export interface IpaProgress {
  /** tapped Start on the 'Why learn it?' card */
  started: boolean;
  /** the sounds whose card he has opened */
  learned: SoundId[];
  /** answers right in a row, by 'sound:direction' */
  streak: Record<string, number>;
  /** when he passed the pass check, if he has */
  passedAt?: number;
}

export const START_PROGRESS: IpaProgress = { started: false, learned: [], streak: {} };

/** A sound is solid when it has been answered right this many times in a row, both ways. */
export const SOLID_RUN = 2;

const isSound = (value: unknown): value is SoundId => typeof value === 'string' && (SOUND_IDS as readonly string[]).includes(value);

/** The progress `text` saved; a fresh start for a text that is not progress, and anything in it that is not a known sound or a count dropped. */
export function parseProgress(text: string | undefined): IpaProgress {
  if (!text) return START_PROGRESS;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return START_PROGRESS;
  }
  if (typeof raw !== 'object' || raw === null) return START_PROGRESS;
  const o = raw as Record<string, unknown>;
  const learned = Array.isArray(o.learned) ? [...new Set(o.learned.filter(isSound))] : [];
  const streak: Record<string, number> = {};
  if (typeof o.streak === 'object' && o.streak !== null) {
    for (const [key, n] of Object.entries(o.streak)) {
      const [id, direction] = key.split(':');
      if (isSound(id) && (direction === 'hear' || direction === 'see') && typeof n === 'number' && Number.isInteger(n) && n > 0) streak[key] = n;
    }
  }
  const progress: IpaProgress = { started: o.started === true, learned, streak };
  if (typeof o.passedAt === 'number' && Number.isFinite(o.passedAt)) progress.passedAt = o.passedAt;
  return progress;
}

export const learnedOf = (progress: IpaProgress): SoundId[] => progress.learned;

export const begin = (progress: IpaProgress): IpaProgress => (progress.started ? progress : { ...progress, started: true });

/** `id`'s card has been opened. */
export function markLearned(progress: IpaProgress, id: SoundId): IpaProgress {
  return progress.learned.includes(id) ? progress : { ...progress, learned: [...progress.learned, id] };
}

/** An answer in a drill or the pass check: right adds one to the count of rights in a row for the sound that way, wrong starts it again. */
export function noteAnswer(progress: IpaProgress, id: SoundId, direction: Direction, right: boolean): IpaProgress {
  const key = `${id}:${direction}`;
  const streak = { ...progress.streak };
  if (right) streak[key] = (streak[key] ?? 0) + 1;
  else delete streak[key];
  return { ...progress, streak };
}

/** How many answers right in a row a sound has, the smaller of its two ways: what a round draws the weakest by. */
export const strengthOf = (progress: IpaProgress, id: SoundId): number => Math.min(progress.streak[`${id}:hear`] ?? 0, progress.streak[`${id}:see`] ?? 0);

/** The sounds right SOLID_RUN times in a row both ways, in the inventory's order. */
export const solidOf = (progress: IpaProgress): SoundId[] => SOUND_IDS.filter((id) => strengthOf(progress, id) >= SOLID_RUN);

export const markPassed = (progress: IpaProgress, when: number): IpaProgress => ({ ...progress, passedAt: when });
