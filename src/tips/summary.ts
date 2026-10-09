// src/tips/summary.ts — the usage summary the 'tips' grind is asked about (grinds/tips.*, docs/tips.md): what he uses and what he has
// never touched, as a short object of counts and ids. It is built from the usage log (usageLog.ts), the counts of what he has done
// and the settings he has chosen. It carries no verse text, no word and nothing he typed: ids of screens, features and settings, and
// numbers. `summarize` is pure; `usageSummary` reads the stores.
import { listUsage, savedSettings, usageCounts, dayOf, type UsageCounts, type UsageRow } from '../data/repositories';
import { getStudyResources } from '../data/repositories/resources';
import type { Route } from '../nav/route';
import { SETTINGS } from '../settings/registry';
import { LANGUAGES } from '../speech/languages';

const DAY = 86_400_000;

/** Everything the summary is built from. */
export interface Facts {
  usage: UsageRow[];
  counts: UsageCounts;
  /** every saved setting by its store key (a row exists only once he has chosen) */
  saved: Record<string, string>;
  /** the ids of the study resources switched on */
  studyOn: string[];
}

/** The screens a tip may point to (the reader, 'home', is where he always is). */
export const SCREENS: readonly { id: Exclude<Route, 'home'>; label: string }[] = [
  { id: 'words', label: 'Words' },
  { id: 'import', label: 'Import words' },
  { id: 'test', label: 'Quick test' },
  { id: 'drill', label: 'Parsing drill' },
  { id: 'review', label: 'Review' },
  { id: 'placement', label: 'Grammar placement' },
  { id: 'goal', label: 'Goal' },
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
];

interface Evidence extends Facts {
  /** whether the log has `name` at all */
  used(name: string): boolean;
}

/** The things in the app he can take up, and how to tell that he has. */
export const FEATURES: readonly { id: string; label: string; used(e: Evidence): boolean }[] = [
  { id: 'ask', label: 'Ask the tutor about a verse', used: (e) => e.counts.asks > 0 },
  { id: 'talk', label: 'Talk about a verse or chapter', used: (e) => e.counts.talks > 0 },
  { id: 'quick-test', label: 'Quick test', used: (e) => e.counts.quizAnswers > 0 },
  { id: 'parsing-drill', label: 'Parsing drill', used: (e) => e.counts.drillAnswers > 0 },
  { id: 'review', label: 'Review of due words', used: (e) => e.used('screen:review') },
  { id: 'reading-check', label: 'Read a verse aloud and be checked', used: (e) => e.counts.readings > 0 },
  { id: 'read-aloud', label: 'Hear the chapter or a verse read aloud', used: (e) => e.used('verse-reading') },
  { id: 'long-press-speak', label: 'Press and hold a word to hear it', used: (e) => e.used('word-spoken') },
  { id: 'word-help', label: 'Help with this word on the word sheet', used: (e) => e.used('word-help') },
  { id: 'grammar-sheet', label: 'Open a grammar term from a word', used: (e) => e.used('grammar-term-opened') },
  { id: 'know-grammar', label: 'Mark a grammar term as known', used: (e) => e.counts.grammarKnown > 0 },
  { id: 'weave', label: 'Weave Greek words into the English', used: (e) => ['solid', 'solid+learning'].includes(e.saved.weave ?? '') },
  { id: 'study-links', label: 'Study links on the word sheet', used: (e) => e.studyOn.length > 0 },
  { id: 'other-chapters', label: 'Open another chapter (the picker or the chapter buttons)', used: (e) => e.used('chapter-changed') },
  { id: 'goal', label: 'Set a reading goal', used: (e) => (e.saved.goal ?? '') !== '' },
  { id: 'placement', label: 'Finish the grammar placement', used: (e) => e.used('placement-done') },
];

/** The key a registry setting is saved under: voices and speeds are per language ('voice.greek', 'rate.greek'), the rest by their key. */
const STORE_KEYS: Record<string, string> = Object.fromEntries(
  LANGUAGES.flatMap((l) => [
    [`${l.id}Voice`, `voice.${l.id}`],
    [`${l.id}Rate`, `rate.${l.id}`],
  ]),
);
const storeKey = (key: string) => STORE_KEYS[key] ?? key;

export interface UsageSummary {
  /** days on which anything was logged */
  days_used: number;
  days_used_last_7: number;
  /** whole days since the first logged day; null with no use */
  first_used_days_ago: number | null;
  screens_visited: string[];
  screens_never: string[];
  features_used: string[];
  features_never: string[];
  settings_changed: string[];
  settings_never: string[];
  /** settings he chose to set to off */
  turned_off: string[];
  counts: UsageCounts;
}

export function summarize(facts: Facts, now: number): UsageSummary {
  const names = new Set(facts.usage.map((r) => r.name));
  const days = [...new Set(facts.usage.map((r) => r.day))].sort();
  const week = new Set(Array.from({ length: 7 }, (_, i) => dayOf(now - i * DAY)));
  const first = days[0];
  // Whole days between local calendar days, so an hour of daylight saving never moves it.
  const wholeDays = (from: string) => Math.round((Date.parse(dayOf(now)) - Date.parse(from)) / DAY);

  const evidence: Evidence = { ...facts, used: (name) => names.has(name) };
  const screens = SCREENS.map((s) => [s.id, names.has(`screen:${s.id}`)] as const);
  const features = FEATURES.map((f) => [f.id, f.used(evidence)] as const);
  const settings = SETTINGS.map((s) => [s.key, storeKey(s.key) in facts.saved] as const);
  const ids = (list: readonly (readonly [string, boolean])[], wanted: boolean) => list.filter(([, on]) => on === wanted).map(([id]) => id);

  return {
    days_used: days.length,
    days_used_last_7: days.filter((d) => week.has(d)).length,
    first_used_days_ago: first === undefined ? null : wholeDays(first),
    screens_visited: ids(screens, true),
    screens_never: ids(screens, false),
    features_used: ids(features, true),
    features_never: ids(features, false),
    settings_changed: ids(settings, true),
    settings_never: ids(settings, false),
    turned_off: SETTINGS.filter((s) => facts.saved[storeKey(s.key)] === 'off').map((s) => s.key),
    counts: facts.counts,
  };
}

export async function gatherFacts(): Promise<Facts> {
  const [usage, counts, saved, study] = await Promise.all([listUsage(), usageCounts(), savedSettings(), getStudyResources()]);
  return { usage, counts, saved, studyOn: study.on };
}

/** The summary of what the stores hold now. */
export async function usageSummary(now = Date.now()): Promise<UsageSummary> {
  return summarize(await gatherFacts(), now);
}
