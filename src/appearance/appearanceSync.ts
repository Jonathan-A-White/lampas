// src/appearance/appearanceSync.ts — what he chose in Settings reaches the page. The Theme becomes html[data-theme]
// (the palettes in src/index.css answer to it) and the colour of the browser's bar, which for 'phone' follows the
// phone's scheme live; the Text size becomes html's --lp-scale (the root font size follows it); the Font becomes html's --lp-font-english (the
// English faces in src/index.css follow it; the Greek and the Hebrew do not, mw-5r3p30.311). All are kept in
// localStorage as well as the settings store, so restoreAppearance() can paint them before the first render: a Dark
// reader on a light phone never flashes light.
import { getTextSize } from '../data/repositories';
import { publish, subscribe } from '../events/bus';
import { fontSetting, themeSetting } from '../settings/definitions';
import { announceSetting, getSetting, onSetting } from '../settings/store';
import { DEFAULT_FONT, ENGLISH_FONT_VAR, isFont, stackOf, type FontId } from './fonts';
import { DEFAULT_TEXT_PERCENT, normaliseTextPercent } from './textSizes';
import { DEFAULT_THEME, barColourOf, isTheme, type Theme } from './themes';

const THEME_STORE = 'lampas.theme';
const TEXT_STORE = 'lampas.textSize';
const FONT_STORE = 'lampas.font';
const DARK_QUERY = '(prefers-color-scheme: dark)';

let theme: Theme = DEFAULT_THEME;
/** Whether a Reader with the Immersive reader On is on screen: in the dark palette its page is pure black, and so is the bar. */
let immersiveReader = false;

/** Whether the phone is in its dark scheme; dark (the app's own default) where the browser cannot say. */
const phoneIsDark = (): boolean => (typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY).matches : true);

function paintBar(): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = barColourOf(theme, phoneIsDark(), immersiveReader);
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

/** The Reader says whether it is on screen with the Immersive reader On (false when it goes away), so the bar follows the page. */
export function setImmersiveReader(on: boolean): void {
  immersiveReader = on;
  paintBar();
}

export function applyTextSize(percent: number): void {
  const size = normaliseTextPercent(percent);
  document.documentElement.style.setProperty('--lp-scale', String(size / 100));
  remember(TEXT_STORE, String(size));
}

/** The English font: the one variable the English faces read. The phone's own removes it, so the app's own stack stands. */
export function applyFont(next: FontId): void {
  const stack = stackOf(next);
  if (stack) document.documentElement.style.setProperty(ENGLISH_FONT_VAR, stack);
  else document.documentElement.style.removeProperty(ENGLISH_FONT_VAR);
  remember(FONT_STORE, next);
}

/** Paints the last choices at once, before React renders (call it from main.tsx). */
export function restoreAppearance(): void {
  const savedTheme = localStorage.getItem(THEME_STORE);
  applyTheme(isTheme(savedTheme) ? savedTheme : DEFAULT_THEME);
  const savedSize = Number(localStorage.getItem(TEXT_STORE));
  applyTextSize(savedSize > 0 ? savedSize : DEFAULT_TEXT_PERCENT);
  const savedFont = localStorage.getItem(FONT_STORE);
  applyFont(isFont(savedFont) ? savedFont : DEFAULT_FONT);
}

/** Starts listening to Settings and to the phone's colour scheme, and loads the saved choices; returns the stop. */
export function startAppearanceSync(): () => void {
  let live = true;
  // A choice made while the saved ones are still being read wins over them: the read only fills in what was not written.
  let themeWritten = false;
  let sizeWritten = false;
  let fontWritten = false;
  let reading = false;
  const stops = [
    onSetting(themeSetting, (saved) => {
      if (!reading) themeWritten = true;
      applyTheme(saved);
    }),
    onSetting(fontSetting, (saved) => {
      if (!reading) fontWritten = true;
      applyFont(saved);
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
  void Promise.all([getSetting(themeSetting), getTextSize(), getSetting(fontSetting)]).then(([savedTheme, savedSize, savedFont]) => {
    if (!live) return;
    reading = true;
    if (!themeWritten) announceSetting(themeSetting, savedTheme);
    if (!sizeWritten) publish({ kind: 'text-size-changed', percent: savedSize });
    if (!fontWritten) announceSetting(fontSetting, savedFont);
    reading = false;
  });
  return () => {
    live = false;
    stops.forEach((stop) => stop());
  };
}
