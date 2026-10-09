// src/script/scripts.ts — the scripts the tutor writes besides English and Greek, and how deep into each one he wants to go (mw-5r3p30.97).
// Everything here is per language, so Hebrew is one entry and a Hebrew Old Testament reader, or another language, reuses the setting, the font
// class and the splitting unchanged: a language is one more entry in SCRIPTS (and one in the registry's list of settings, which is built from it).
// Greek is not an entry: its words are set in Gentium Plus wherever they are drawn (its depth is simply 'full', the way the app already writes it).

/** How deep into a language the tutor goes: only its sounds in Latin letters, the letters with the sounds, or the letters as the language writes them. */
export type Depth = 'transliteration' | 'both' | 'full';

export interface DepthInfo {
  id: Depth;
  /** what Settings calls it */
  label: string;
}

export const DEPTHS: readonly DepthInfo[] = [
  { id: 'transliteration', label: 'Transliteration' },
  { id: 'both', label: 'Hebrew and transliteration' },
  { id: 'full', label: 'Full' },
];

export const DEFAULT_DEPTH: Depth = 'both';

export const isDepth = (value: unknown): value is Depth => DEPTHS.some((d) => d.id === value);

export interface TutorScript {
  /** the language tag: 'he' */
  id: 'he';
  /** what Settings calls the language */
  label: string;
  /** the setting's name for the grind and the settings store: 'hebrewDepth' */
  settingKey: string;
  /** what the setting's control is called: 'Hebrew in the tutor' */
  settingLabel: string;
  /** the direction its text runs */
  dir: 'rtl' | 'ltr';
  /** the class that sets it in its bundled font (src/index.css) */
  className: string;
  /** one letter of the script, with its points and marks, as a regular expression class body */
  letters: string;
  /** what each depth looks like for a sample word, for the setting's hint and the grind */
  examples: Record<Depth, string>;
}

export const HEBREW: TutorScript = {
  id: 'he',
  label: 'Hebrew',
  settingKey: 'hebrewDepth',
  settingLabel: 'Hebrew in the tutor',
  dir: 'rtl',
  className: 'script-he',
  // the Hebrew block (letters, points, accents, the maqaf) and the presentation forms
  letters: '\\u0590-\\u05FF\\uFB1D-\\uFB4F',
  examples: { transliteration: 'tsedeq', both: 'צֶדֶק tsedeq', full: 'צֶדֶק' },
};

export const SCRIPTS: readonly TutorScript[] = [HEBREW];

export const scriptOf = (id: string): TutorScript | undefined => SCRIPTS.find((s) => s.id === id);

/** The whole of a text in one script, or in a script and its neighbours. `script` is missing for the text no script owns (English, Greek, marks). */
export interface ScriptPart {
  text: string;
  script?: TutorScript['id'];
}

// Words of a script with only spaces between them are one stretch, so a phrase is one right-to-left run (the same cut answerRuns makes for Greek).
const stretchOf = (script: TutorScript): RegExp => {
  const word = `[${script.letters}]+`;
  return new RegExp(`${word}(?:[ \\u00a0]+${word})*`, 'gu');
};

/** `text` cut into the stretches of each script and the text between them, in order; the parts joined are the text. */
export function splitScripts(text: string): ScriptPart[] {
  const parts: ScriptPart[] = [{ text }];
  for (const script of SCRIPTS) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.script) continue;
      const found = [...part.text.matchAll(stretchOf(script))];
      if (found.length === 0) continue;
      const cut: ScriptPart[] = [];
      let at = 0;
      for (const m of found) {
        if (m.index > at) cut.push({ text: part.text.slice(at, m.index) });
        cut.push({ text: m[0], script: script.id });
        at = m.index + m[0].length;
      }
      if (at < part.text.length) cut.push({ text: part.text.slice(at) });
      parts.splice(i, 1, ...cut);
      i += cut.length - 1;
    }
  }
  return parts;
}

/** `text` with every stretch of the scripts here taken out (a space in its place): what a voice that does not speak them should be given. */
export function withoutScripts(text: string): string {
  return splitScripts(text)
    .map((p) => (p.script ? ' ' : p.text))
    .join('');
}
