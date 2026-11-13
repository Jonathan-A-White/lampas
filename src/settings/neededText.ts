// src/settings/neededText.ts — what the Settings page says above a linked row that something else hides (src/SettingsScreen.tsx): the setting to turn on first, or the dial's step that shows it.
import { GREEK_LEVELS } from './definitions/greekInterest';
import { HEBREW_LEVELS } from './definitions/hebrewInterest';
import { dialOf, visibleRows, type SettingsRow, type Values } from './rows';

/** What a linked row that something else hides says: a Greek or Hebrew row names the dial's step that shows it, a row both share says to raise either dial, any other says to turn on the setting it depends on. */
export function neededText(values: Values, row: SettingsRow | undefined, needed: SettingsRow | undefined): string {
  const dial = row && dialOf(row);
  if (!row || (dial !== 'greekInterest' && dial !== 'hebrewInterest' && dial !== 'depth')) return needed ? `“${row?.label}” is shown once “${needed.label}” is on. Turn “${needed.label}” on first.` : `“${row?.label}” is shown only when your Library import says you own it in Logos. Import your Logos library first.`;
  // the step is found with both languages chosen, so only the dial's level decides
  const level = (n: number) => String(n);
  const both = { ...values, languages: 'both' };
  if (dial === 'depth') {
    const step = GREEK_LEVELS.find((l) => visibleRows({ ...both, depth: level(l.level) }, '').some((r) => r.key === row.key));
    return `“${row.label}” is shown from “${step?.name ?? 'All in'}” up: choose a language at the top of Settings, then raise “How much Greek?” or “How much Hebrew?”.`;
  }
  const key = dial;
  const lang = key === 'greekInterest' ? 'Greek' : 'Hebrew';
  const steps = key === 'greekInterest' ? GREEK_LEVELS : HEBREW_LEVELS;
  const step = steps.find((l) => visibleRows({ ...both, [key]: level(l.level) }, '').some((r) => r.key === row.key));
  return `“${row.label}” is ${lang}. It is shown from “${step?.name ?? 'All in'}” up: choose ${lang} at the top of Settings, then raise “How much ${lang}?”.`;
}
