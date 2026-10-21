// How much Greek (Settings home, the dial at the top, mw-3ased2.2): 0 to 5, each step a real change. The level decides which Greek settings and views are
// shown, by the ordinary dependsOn rule (a row says `dependsOn: greekFrom(n)`: shown from step n up), and the Reader reads it too (viewAt, weaveAt,
// newWordsAt: what is hidden does not act). Moving the dial is src/data/repositories/greekInterest.ts. The names and lines are the Mayor's, PROVISIONAL until the
// Governor confirms them (the epic mw-3ased2). A phone that has not been placed yet reads 5, All in: nothing is hidden until placeGreekInterest has chosen a level.
import { defineSetting, type Dependency } from '../define';
import type { Weave } from './weave';

export type GreekLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface GreekStep {
  level: GreekLevel;
  /** the step's name, in the dial and on the tutor's offer */
  name: string;
  /** one line of what the step means (at most 120 characters) */
  line: string;
}

/** The six steps of the dial, lowest first. */
export const GREEK_LEVELS: readonly GreekStep[] = [
  { level: 0, name: 'Just English', line: 'A plain English Bible. No Greek anywhere, until you ask for it.' },
  { level: 1, name: 'Curious', line: 'Peek underneath: tap a word for its Greek and Strong\'s number, or flip a chapter to the Greek.' },
  { level: 2, name: 'Dipping a toe', line: 'A few Greek words woven into the English, as you come to know them.' },
  { level: 3, name: 'Learning', line: 'Your daily path: new words each day, the grammar behind them, lessons read aloud.' },
  { level: 4, name: 'Reading in Greek', line: 'The Reader opens in the Greek, the Weave in Greek word order, and a goal to read toward.' },
  { level: 5, name: 'All in', line: 'Everything: every Greek setting, the paradigms, Hebrew in the tutor, taught to your goal.' },
];

/** The highest step: All in. A phone not yet placed reads it, so nothing is hidden. */
export const GREEK_TOP: GreekLevel = 5;

export const greekLevelOf = (raw: unknown): GreekLevel => {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= GREEK_TOP ? (n as GreekLevel) : GREEK_TOP;
};

/** The dependency of a row that the dial shows from step `level` up (as text, like every dependency: the setting's value). */
export const greekFrom = (level: GreekLevel): Dependency => ({ key: 'greekInterest', shown: (value) => Number(value) >= level });

/** The least step that shows the Reader's English | Greek view and a word's sheet (Curious). */
export const GREEK_VIEW_FROM: GreekLevel = 1;
/** The least step that shows the Weave (Dipping a toe). */
export const GREEK_WEAVE_FROM: GreekLevel = 2;
/** The least step that offers new words a day (Learning). */
export const GREEK_WORDS_FROM: GreekLevel = 3;

/** The view the Reader draws at a step: the Greek view only from Curious up. */
export const viewAt = <V extends string>(level: GreekLevel, view: V): V | 'english' => (level >= GREEK_VIEW_FROM ? view : 'english');
/** The Weave the Reader weaves at a step: none below Dipping a toe. */
export const weaveAt = (level: GreekLevel, weave: Weave): Weave => (level >= GREEK_WEAVE_FROM ? weave : 'off');
/** New words a day at a step: none below Learning. */
export const newWordsAt = (level: GreekLevel, perDay: number): number => (level >= GREEK_WORDS_FROM ? perDay : 0);

/** The step a phone is placed at by what its reader has: the Greek view means 4, new words a day above 0 means 3, the Weave on means 2, else 0. */
export function placementOf(has: { view: 'english' | 'greek'; newWords: number; weave: Weave }): GreekLevel {
  if (has.view === 'greek') return 4;
  if (has.newWords > 0) return 3;
  if (has.weave !== 'off') return 2;
  return 0;
}

export const greekInterestSetting = defineSetting<string>({
  key: 'greekInterest',
  default: String(GREEK_TOP),
  allowed: { kind: 'choice', values: GREEK_LEVELS.map((l) => ({ value: String(l.level), label: l.name })) },
  section: 'dial',
  label: 'How much Greek?',
  hint: 'From none to all in: each step shows more Greek, and nothing more.',
  help: `How much Greek you want in Lampas, from 0 to 5. ${GREEK_LEVELS.map((l) => `${l.level}, ${l.name}: ${l.line}`).join(' ')} Moving it up sets what the new step brings in to its starting values; moving it down turns off what the lower step hides and keeps your own values, so going back up restores them.`,
});
