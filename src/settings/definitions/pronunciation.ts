// Pronunciation (Settings > Listening > Pronunciation, mw-gdcyf98.6): ONE choice for both languages, a family, as Greek and Hebrew are said and spelled out together
// (Modern: Modern Greek and Israeli Hebrew). Writing the family writes both languages' own settings (greekPronunciation, hebrewPronunciation; src/settings/registry.ts);
// 'Set each language on its own' swaps the family for the two rows. PROVISIONAL: the labels and hints are the Mayor's, the Governor to confirm.
import { DEFAULT_HEBREW_PRONUNCIATION, DEFAULT_PRONUNCIATION, pronunciationsOf, type GreekPronunciation } from '../../speech/pronunciation';
import { defineSetting, type Dependency } from '../define';
import { depthFrom } from './interest';

/** A family of pronunciations: the Greek scheme and the Hebrew one it sets together. Another family (Erasmian Greek with a Tiberian Hebrew) is one more line here. */
export interface PronunciationFamily {
  id: string;
  label: string;
  /** a line under the label on the screen */
  note: string;
  greek: GreekPronunciation;
  hebrew: GreekPronunciation;
}

export const PRONUNCIATION_FAMILIES: readonly PronunciationFamily[] = [
  { id: 'modern', label: 'Modern', note: 'Modern Greek and Israeli Hebrew', greek: DEFAULT_PRONUNCIATION, hebrew: DEFAULT_HEBREW_PRONUNCIATION },
];

export const DEFAULT_FAMILY: string = PRONUNCIATION_FAMILIES[0].id;

/** The family with this id; the default one when there is none. */
export const familyOf = (id: unknown): PronunciationFamily => PRONUNCIATION_FAMILIES.find((f) => f.id === id) ?? PRONUNCIATION_FAMILIES[0];

export const pronunciationSetting = defineSetting<string>({
  key: 'pronunciation',
  default: DEFAULT_FAMILY,
  allowed: { kind: 'choice', values: PRONUNCIATION_FAMILIES.map((f) => ({ value: f.id, label: f.label })) },
  section: 'pronunciation',
  label: 'Pronunciation',
  hint: 'How Greek and Hebrew are said and spelled out: one way for both',
  help: 'How Greek and Hebrew are said and respelled, one choice for both. **Modern** is Modern Greek and Israeli Hebrew. It shows while Set each language on its own is Off.',
  // the family is shown while each language is not set on its own (and, through the switch, from Curious up)
  dependsOn: { key: 'pronunciationSeparate', shown: (value) => value !== 'on' },
});

export const pronunciationSeparateSetting = defineSetting<'on' | 'off'>({
  key: 'pronunciationSeparate',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'pronunciation',
  label: 'Set each language on its own',
  hint: 'Choose Greek and Hebrew pronunciation separately',
  help: 'On shows a Greek pronunciation and a Hebrew pronunciation to choose on their own. Off puts both back on Pronunciation.',
  dependsOn: depthFrom(1),
});

/** The key readValues (src/settings/rows.ts) answers 'on' for when Set each language on its own is On and that language's dial is at Curious or above: it is no setting. */
export const SEPARATE_KEYS = { grc: 'pronunciationSeparate.grc', he: 'pronunciationSeparate.he' } as const;

/** The dependency of a language's own pronunciation row: shown while the switch is On and the language is chosen. */
export const separateFrom = (lang: keyof typeof SEPARATE_KEYS): Dependency => ({ key: SEPARATE_KEYS[lang], shown: (value) => value === 'on' });

export const hebrewPronunciationSetting = defineSetting<string>({
  key: 'hebrewPronunciation',
  default: DEFAULT_HEBREW_PRONUNCIATION,
  allowed: { kind: 'choice', values: pronunciationsOf('he').map((p) => ({ value: p.id, label: p.label })) },
  section: 'pronunciation',
  label: 'Hebrew pronunciation',
  hint: 'How Hebrew is pronounced when it is read aloud.',
  dependsOn: separateFrom('he'),
});
