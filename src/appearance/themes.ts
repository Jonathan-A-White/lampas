// src/appearance/themes.ts — the colour themes as a list. 'phone' follows the phone's own colour scheme (live); the
// others are chosen. The palettes themselves are CSS variables in src/index.css, picked by html[data-theme]; a new
// theme is one more entry here and one more palette there.

/** The ids of the entries below. */
export type Theme = 'phone' | 'light' | 'dark';

export interface ThemeInfo {
  id: Theme;
  /** what Settings shows */
  label: string;
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'phone', label: 'Phone' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export const DEFAULT_THEME: Theme = 'phone';

export function isTheme(value: unknown): value is Theme {
  return THEMES.some((t) => t.id === value);
}

/** The colour of the browser's bar for each palette: the same as the canvas in src/index.css (tests/unit/themes.test.ts
 * checks) and, for dark, as the manifest's. */
export const THEME_COLORS = { dark: '#0a0e17', light: '#f3f5f9' } as const;

/** The palette in use: the chosen theme, or for 'phone' the phone's own scheme. */
export function paletteOf(theme: Theme, phoneIsDark: boolean): 'dark' | 'light' {
  return theme === 'phone' ? (phoneIsDark ? 'dark' : 'light') : theme;
}
