// src/appearance/fonts.ts — the English fonts as a list (mw-5r3p30.311). Settings > Appearance > Font picks the face of the English text only (the
// reader, the sheets, the screens); the Greek (Gentium Plus) and the Hebrew (Noto Serif Hebrew) keep their own, and the type size is never touched.
// 'phone' is the phone's own face and the default; the other three are bundled in src/fonts (@font-face in src/index.css), so they work offline
// and are precached. Each is a face publishers already trust, none a novelty: a Bible reader's tone. A new font is one more entry here, its woff2
// files and @font-face, its licence beside them and a credit in ATTRIBUTION.md.

/** The ids of the entries below. */
export type FontId = 'phone' | 'literata' | 'atkinson' | 'lexend';

export interface FontInfo {
  id: FontId;
  /** what Settings shows */
  label: string;
  /** the one plain line under it: what it is and who it suits */
  line: string;
  /** the CSS font-family it sets; null = the app's own stack (the phone's face) */
  stack: string | null;
}

export const FONTS: readonly FontInfo[] = [
  { id: 'phone', label: "The phone's own", line: "Your phone's usual face; fits everyone and is the default.", stack: null },
  { id: 'literata', label: 'Literata', line: 'A book face for long reading; suits readers who like a serif page.', stack: '"Literata", Georgia, "Noto Serif", "Times New Roman", serif' },
  { id: 'atkinson', label: 'Atkinson Hyperlegible', line: 'Very clear, made for low vision; suits weaker eyes and older readers.', stack: '"Atkinson Hyperlegible", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: 'lexend', label: 'Lexend', line: 'Built for reading ease; suits younger readers and anyone who tires over long lines.', stack: '"Lexend", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
];

/** The phone's own face: the fallback of --font-sans in src/index.css without --lp-font-english. The Font chooser draws "The phone's own" in it whatever is chosen. */
export const PHONE_STACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const DEFAULT_FONT: FontId = 'phone';

export function isFont(value: unknown): value is FontId {
  return FONTS.some((f) => f.id === value);
}

/** The CSS font-family of a choice, or null for the phone's own (the app's stack in src/index.css then stands). */
export function stackOf(id: FontId): string | null {
  return FONTS.find((f) => f.id === id)?.stack ?? null;
}

/** The variable on <html> that carries the choice; src/index.css reads it for the English faces only (--font-sans, --font-book). */
export const ENGLISH_FONT_VAR = '--lp-font-english';
