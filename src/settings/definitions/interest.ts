// A dial per language (mw-gdcyf98.2): 'How much Greek?' (mw-3ased2.2) and 'How much Hebrew?', each 0 to 5 with the same six named steps, each step a real change.
// A dial's level decides which of its language's settings and views are shown, by the ordinary dependsOn rule (a row says `dependsOn: interestFrom(lang, n)`:
// shown from step n up; a shared row says `depthFrom(n)`, the higher of the two). The Reader reads the dial of the chapter's own language (levelOf, then viewAt, weaveAt, newWordsAt in greekInterest.ts: they take a step, and the step is of the chapter's language).
// Moving a dial is src/data/repositories/greekInterest.ts. The names and lines are the Mayor's, PROVISIONAL until the Governor confirms them (the epic mw-3ased2).
// A phone not yet placed reads Greek 5, All in (nothing hidden) and Hebrew 0 until placeInterest has chosen both; the languages he reads is the two dials' own state (languagesOf).
import { defineSetting, type Dependency } from '../define';

export type InterestLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** The language of a dial: 'grc' Greek, 'hbo' Hebrew (the codes the Reader gives a chapter). */
export type InterestLang = 'grc' | 'hbo';

export interface InterestStep {
  level: InterestLevel;
  /** the step's name, in the dial and on the tutor's offer */
  name: string;
  /** one line of what the step means (at most 120 characters); it names its own language only */
  line: string;
}

/** The highest step: All in. */
export const INTEREST_TOP: InterestLevel = 5;

const GREEK_STEPS: readonly InterestStep[] = [
  { level: 0, name: 'Just English', line: 'A plain English Bible. No Greek anywhere, until you ask for it.' },
  { level: 1, name: 'Curious', line: 'Peek underneath: tap a word for its Greek and Strong\'s number, or flip a chapter to the Greek.' },
  { level: 2, name: 'Dipping a toe', line: 'A few Greek words woven into the English, as you come to know them.' },
  { level: 3, name: 'Learning', line: 'Your daily path: new words each day, the grammar behind them, lessons read aloud.' },
  { level: 4, name: 'Reading in Greek', line: 'The Reader opens in the Greek, the Weave in Greek word order, and a goal to read toward.' },
  { level: 5, name: 'All in', line: 'Everything: every Greek setting, the paradigms, taught to your goal.' },
];

const HEBREW_STEPS: readonly InterestStep[] = [
  { level: 0, name: 'Just English', line: 'A plain English Bible. No Hebrew anywhere, until you ask for it.' },
  { level: 1, name: 'Curious', line: 'Peek underneath: tap a word for its Hebrew and Strong\'s number, or flip a chapter to the Hebrew.' },
  { level: 2, name: 'Dipping a toe', line: 'A few Hebrew words woven into the English, as you come to know them.' },
  { level: 3, name: 'Learning', line: 'Your daily path: new words each day, the grammar behind them, lessons read aloud.' },
  { level: 4, name: 'Reading in Hebrew', line: 'The Reader opens in the Hebrew, the Weave in Hebrew word order, and a goal to read toward.' },
  { level: 5, name: 'All in', line: 'Everything: every Hebrew setting, the paradigms, taught to your goal.' },
];

/** The six steps of a language's dial, lowest first. */
export const levelsOf = (lang: InterestLang): readonly InterestStep[] => (lang === 'grc' ? GREEK_STEPS : HEBREW_STEPS);

/** The two dials' steps together: Greek ('grc') and Hebrew ('he', the code a study resource gives its language). */
export interface InterestLevels {
  grc: InterestLevel;
  he: InterestLevel;
}

/** The step of the dial that belongs to a chapter's source language (mw-gdcyf98.3): a New Testament chapter ('grc') is read by the Greek dial, an Old Testament one ('hbo') by the Hebrew dial. */
export const levelOf = (source: InterestLang, levels: InterestLevels): InterestLevel => (source === 'hbo' ? levels.he : levels.grc);

/** The higher of the two dials: what a thing both languages share (his Logos works, the tutor's resources) is shown at. */
export const higherOf = (levels: InterestLevels): InterestLevel => (levels.grc > levels.he ? levels.grc : levels.he);

/** The key of a language's dial in the settings store. */
export const interestKeyOf = (lang: InterestLang): 'greekInterest' | 'hebrewInterest' => (lang === 'grc' ? 'greekInterest' : 'hebrewInterest');

/** The step a dial reads when nothing valid is saved: Greek All in (nothing hidden before a phone is placed), Hebrew none. */
const startOf = (lang: InterestLang): InterestLevel => (lang === 'grc' ? INTEREST_TOP : 0);

/** A saved or asked value as a level of `lang`'s dial; the language's unplaced level when it is none. */
export const interestLevelOf = (lang: InterestLang, raw: unknown): InterestLevel => {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= INTEREST_TOP ? (n as InterestLevel) : startOf(lang);
};

/** The dependency of a row that `lang`'s dial shows from step `level` up (as text, like every dependency: the setting's value). */
export const interestFrom = (lang: InterestLang, level: InterestLevel): Dependency => ({ key: interestKeyOf(lang), shown: (value) => Number(value) >= level });

/** The key readValues (src/settings/rows.ts) answers as the higher of the two dials: a row both languages share depends on it. It is no setting. */
export const DEPTH_KEY = 'depth';

/** The dependency of a row the higher of the two dials shows from step `level` up. */
export const depthFrom = (level: InterestLevel): Dependency => ({ key: DEPTH_KEY, shown: (value) => Number(value) >= level });

/** Which languages he reads, as the two dials stand: 'english' while both are 0. The row 'Which languages?' is this and nothing else. */
export type Languages = 'english' | 'greek' | 'hebrew' | 'both';

export const LANGUAGES_CHOICES: readonly { value: Languages; label: string }[] = [
  { value: 'english', label: 'English only' },
  { value: 'greek', label: 'Greek' },
  { value: 'hebrew', label: 'Hebrew' },
  { value: 'both', label: 'Greek and Hebrew' },
];

export const languagesOf = (greek: InterestLevel, hebrew: InterestLevel): Languages => {
  if (greek > 0 && hebrew > 0) return 'both';
  if (greek > 0) return 'greek';
  return hebrew > 0 ? 'hebrew' : 'english';
};

/** The dependency of a dial's own row: drawn only while its language is chosen. */
const chosen = (lang: InterestLang): Dependency => ({
  key: 'languages',
  shown: (value) => value === 'both' || value === (lang === 'grc' ? 'greek' : 'hebrew'),
});

/** The dial of a language: a choice of '0' to '5', section dial, drawn on the Settings home under 'Which languages?'. */
export function interestSetting(lang: InterestLang) {
  const steps = levelsOf(lang);
  const name = lang === 'grc' ? 'Greek' : 'Hebrew';
  return defineSetting<string>({
    key: interestKeyOf(lang),
    default: String(startOf(lang)),
    allowed: { kind: 'choice', values: steps.map((l) => ({ value: String(l.level), label: l.name })) },
    section: 'dial',
    label: `How much ${name}?`,
    hint: `From none to all in: each step shows more ${name}, and nothing more.`,
    dependsOn: chosen(lang),
    // Markdown (the row's More help draws it with src/markdown/Markdown.tsx): a list, one line a step, the step's number and name in bold
    help: `How much ${name} you want in Lampas, from 0 to 5:\n\n${steps.map((l) => `- **${l.level} · ${l.name}**: ${l.line}`).join('\n')}\n\nMoving it up sets what the new step brings in to its starting values; moving it down turns off what the lower step hides and keeps your own values, so going back up restores them.`,
  });
}
