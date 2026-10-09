// src/data/pace.ts — Lampas pace (mw-bsf54t.7): how many new words a day the Reader offers. Pure. His setting 'New words a day'
// (Off, 3, 5, 10) is the pace when his reviews are in hand; the dial turns it to none when they are not, and up one notch after a
// clean week. PROVISIONAL (the Mayor's, the Governor to confirm): more than 20 due, a last round under 60 percent, a week.
import { DAY } from './schedule';

/** The values of 'New words a day': 0 is Off. */
export const NEW_WORDS_CHOICES = [0, 3, 5, 10] as const;
export type NewWordsADay = (typeof NEW_WORDS_CHOICES)[number];
export const DEFAULT_NEW_WORDS_A_DAY: NewWordsADay = 3;

/** More words due than this dials the pace back. */
export const DUE_LIMIT = 20;
/** A last round scoring under this share right dials the pace back. */
export const SCORE_FLOOR = 0.6;
/** This many clean days dial the pace up one notch. */
export const CLEAN_DAYS_FOR_UP = 7;

/** 'back': none until his reviews are cleared; 'normal': his setting; 'up': one notch above it after a clean week. */
export type PaceReason = 'back' | 'normal' | 'up';
export interface Pace {
  /** new words offered at a time, 0 for none */
  count: number;
  reason: PaceReason;
}

export const isNewWordsADay = (value: unknown): value is NewWordsADay => NEW_WORDS_CHOICES.some((n) => n === value);

/** The setting a saved value stands for: the default when it is none of the four. */
export function normaliseNewWordsADay(value: unknown): NewWordsADay {
  const n = typeof value === 'string' ? Number(value) : value;
  return isNewWordsADay(n) ? n : DEFAULT_NEW_WORDS_A_DAY;
}

/** The pace for `setting`, given the words due now, the last round's share right (null: none yet) and the clean days. Off stays off. */
export function paceFor(setting: NewWordsADay, dueCount: number, lastRoundScore: number | null, cleanDays: number): Pace {
  if (setting === 0) return { count: 0, reason: 'normal' };
  if (dueCount > DUE_LIMIT || (lastRoundScore !== null && lastRoundScore < SCORE_FLOOR)) return { count: 0, reason: 'back' };
  if (cleanDays >= CLEAN_DAYS_FOR_UP) {
    const higher = NEW_WORDS_CHOICES.find((n) => n > setting);
    if (higher !== undefined) return { count: higher, reason: 'up' };
  }
  return { count: setting, reason: 'normal' };
}

/** What Settings says under the control when the pace is not normal. */
export function paceNote(reason: PaceReason): string | null {
  if (reason === 'back') return 'Dialled back: clear your reviews first';
  if (reason === 'up') return 'Dialled up: a clean week';
  return null;
}

/** The last finished review round, and when the current clean run began (ms since the epoch). */
export interface PaceRounds {
  lastScore: number;
  lastWhen: number;
  cleanSince: number;
}

/** The record after a round that scored `score` (the share right) at `now`: a poor round, or a gap of over a week, starts the clean run again. */
export function afterRound(prev: PaceRounds | null, score: number, now: number): PaceRounds {
  const broken = prev === null || score < SCORE_FLOOR || now - prev.lastWhen > CLEAN_DAYS_FOR_UP * DAY;
  return { lastScore: score, lastWhen: now, cleanSince: broken ? now : prev.cleanSince };
}

/** Whole days of clean reviewing at `now`; 0 with no round yet or none for over a week (he stopped, which is not a clean week). */
export function cleanDaysOf(rounds: PaceRounds | null, now: number): number {
  if (!rounds || now - rounds.lastWhen > CLEAN_DAYS_FOR_UP * DAY) return 0;
  return Math.max(0, Math.floor((now - rounds.cleanSince) / DAY));
}
