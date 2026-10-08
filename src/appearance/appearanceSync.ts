// src/appearance/appearanceSync.ts — what he chose in Settings reaches the page. The Theme becomes html[data-theme]
// (the palettes in src/index.css answer to it) and the colour of the browser's bar, which for 'phone' follows the
// phone's scheme live; the Text size becomes html's --lp-scale (the root font size follows it). Both are kept in
// localStorage as well as the settings store, so restoreAppearance() can paint them before the first render: a Dark
// reader on a light phone never flashes light.
import { getTextSize, getTheme } from '../data/repositories';
import { publish, subscribe } from '../events/bus';
import { DEFAULT_TEXT_PERCENT, normaliseTextPercent } from './textSizes';
import { DEFAULT_THEME, THEME_COLORS, isTheme, paletteOf, type Theme } from './themes';

const THEME_STORE = 'lampas.theme';
const TEXT_STORE = 'lampas.textSize';
const DARK_QUERY = '(prefers-color-scheme: dark)';

let theme: Theme = DEFAULT_THEME;

/** Whether the phone is in its dark scheme; dark (the app's own default) where the browser cannot say. */
const phoneIsDark = (): boolean => (typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY).matches : true);

function paintBar(): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLORS[paletteOf(theme, phoneIsDark())];
}

function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // a full or blocked store: the settings store still has it
  }
}

export function applyTheme(next: Theme): void {
  theme = next;
  document.documentElement.dataset.theme = next;
  remember(THEME_STORE, next);
  paintBar();
}

export function applyTextSize(percent: number): void {
  const size = normaliseTextPercent(percent);
  document.documentElement.style.setProperty('--lp-scale', String(size / 100));
  remember(TEXT_STORE, String(size));
}

/** Paints the last choices at once, before React renders (call it from main.tsx). */
export function restoreAppearance(): void {
  const savedTheme = localStorage.getItem(THEME_STORE);
  applyTheme(isTheme(savedTheme) ? savedTheme : DEFAULT_THEME);
  const savedSize = Number(localStorage.getItem(TEXT_STORE));
  applyTextSize(savedSize > 0 ? savedSize : DEFAULT_TEXT_PERCENT);
}

/** Starts listening to Settings and to the phone's colour scheme, and loads the saved choices; returns the stop. */
export function startAppearanceSync(): () => void {
  let live = true;
  // A choice made while the saved ones are still being read wins over them: the read only fills in what was not written.
  let themeWritten = false;
  let sizeWritten = false;
  let reading = false;
  const stops = [
    subscribe('theme-changed', (e) => {
      if (!reading) themeWritten = true;
      applyTheme(e.theme);
    }),
    subscribe('text-size-changed', (e) => {
      if (!reading) sizeWritten = true;
      applyTextSize(e.percent);
    }),
  ];
  const scheme = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  const onScheme = () => paintBar();
  scheme?.addEventListener('change', onScheme);
  stops.push(() => scheme?.removeEventListener('change', onScheme));
  paintBar();
  void Promise.all([getTheme(), getTextSize()]).then(([savedTheme, savedSize]) => {
    if (!live) return;
    reading = true;
    if (!themeWritten) publish({ kind: 'theme-changed', theme: savedTheme });
    if (!sizeWritten) publish({ kind: 'text-size-changed', percent: savedSize });
    reading = false;
  });
  return () => {
    live = false;
    stops.forEach((stop) => stop());
  };
}
