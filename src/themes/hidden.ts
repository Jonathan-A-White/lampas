// src/themes/hidden.ts — the themes he has hidden (mw-qtu3zvz.91, docs/sermons.md 'Hiding a theme'): one setting, 'themesHidden' (src/settings/definitions/themes.ts), holds their names a line each. Pure: the text, the set and the
// test of a name; src/themes/index.ts reads and writes the setting and leaves a hidden theme out of themesFor, so every place that shows a theme (the Themes line, 'On the same theme', the tutor's themes) leaves it out.
// A name is hidden by its `themeKey`, so a theme two lists give under one name (mw-qtu3zvz.90) is hidden in both, and a name written two ways is one.
import { themeKey } from './themesFor';

/** The key the hidden set is kept under. */
export const HIDDEN_KEY = 'themesHidden';

/** The names the saved text holds, a name once (by `themeKey`), in the order saved; empty where nothing is saved. */
export function parseHidden(raw: string | undefined): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const line of (raw ?? '').split('\n')) {
    const name = line.trim();
    const key = themeKey(name);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** The text a set of names is kept as: a name a line. */
export const hiddenText = (names: readonly string[]): string => names.join('\n');

/** Whether a theme's name is one of the hidden names. */
export function isHidden(label: string, hidden: readonly string[]): boolean {
  if (hidden.length === 0) return false;
  const key = themeKey(label);
  return hidden.some((name) => themeKey(name) === key);
}

/** The names with `label` added (a name once); the names as they were when it is there already. */
export const withHidden = (hidden: readonly string[], label: string): string[] => (isHidden(label, hidden) || themeKey(label) === '' ? [...hidden] : [...hidden, label.trim()]);

/** The names without `label`; the names as they were when it is not there. */
export const withoutHidden = (hidden: readonly string[], label: string): string[] => hidden.filter((name) => themeKey(name) !== themeKey(label));
