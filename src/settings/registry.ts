// src/settings/registry.ts — every Settings item the app has, as a list: its key, its label, the values it allows, and how to
// read and write it. Writing saves the choice (src/data/repositories) and tells the bus, which is all the Settings screen does
// when he taps (it calls `write` here), so a change he asks for in the Bible talk takes the same path. The bible-talk grind is
// told this list (src/settings/grindText.ts builds its schema and instructions from it): a new setting is talkable by adding it
// here, and tests/unit/settings-registry.test.tsx fails if a control of the Settings screen has no entry.
import { TEXT_SIZES } from '../appearance/textSizes';
import { THEMES } from '../appearance/themes';
import {
  getGreekPronunciation,
  getLayout,
  getSectionHeadings,
  getSpeechRate,
  getSpeechRates,
  getTextSize,
  getTheme,
  getVoice,
  getWeave,
  setGreekPronunciation,
  setLayout,
  setSectionHeadings,
  setSpeechRate,
  setTextSize,
  setTheme,
  setVoice,
  setWeave,
  type ReadingLayout,
  type SectionHeadings,
  type Weave,
} from '../data/repositories';
import { publish } from '../events/bus';
import { LAYOUTS } from '../layout/layouts';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, RATE_STEP } from '../speech/languages';
import { PRONUNCIATIONS } from '../speech/pronunciation';

/** What a setting holds: a choice's value (text) or a speed (number). */
export type SettingValue = string | number;

/** The voice value that means the phone's own pick; a voice he chose in Settings is its voiceURI, which a talk cannot name. */
export const PHONE_VOICE = 'default';

export type Allowed =
  | { kind: 'choice'; values: readonly { value: string; label: string }[] }
  | { kind: 'number'; min: number; max: number; step: number };

export interface SettingEntry {
  /** what the grind and `settings_changes` call it: 'greekRate' */
  key: string;
  /** what the Settings screen calls it (the name of its control): 'Greek speed' */
  label: string;
  /** one line for the grind: what it does */
  hint: string;
  allowed: Allowed;
  /** the saved value, as it was before a change (a voice he chose is its voiceURI) */
  read(): Promise<SettingValue>;
  /** saves `value` and tells the bus; `value` is one `read` gave or one `allowed` names */
  write(value: SettingValue): Promise<void>;
  /** the value as a person reads it: 'Greek speed 0.8x', 'Theme: Dark' */
  show(value: SettingValue): string;
}

function choice(
  key: string,
  label: string,
  hint: string,
  values: readonly { value: string; label: string }[],
  read: () => Promise<SettingValue>,
  write: (value: string) => Promise<void>,
): SettingEntry {
  return {
    key,
    label,
    hint,
    allowed: { kind: 'choice', values },
    read,
    write: (value) => write(String(value)),
    show: (value) => `${label}: ${values.find((v) => v.value === value)?.label ?? String(value)}`,
  };
}

const textSizeId = (percent: number): SettingValue => TEXT_SIZES.find((t) => t.percent === percent)?.id ?? percent;

const voiceEntries = LANGUAGES.map((l): SettingEntry => {
  const entry = choice(
    `${l.id}Voice`,
    `${l.label} voice`,
    `Which voice reads ${l.label} aloud. Only the phone's own pick can be asked for; the other voices are the phone's.`,
    [{ value: PHONE_VOICE, label: 'Phone default' }],
    async () => (await getVoice(l.id)) ?? PHONE_VOICE,
    async (value) => {
      const voice = value === PHONE_VOICE || value === '' ? null : value;
      await setVoice(l.id, voice);
      const other = await getVoice(l.id === 'english' ? 'greek' : 'english');
      publish({ kind: 'voices-changed', english: l.id === 'english' ? voice : other, greek: l.id === 'greek' ? voice : other });
    },
  );
  // A voice he chose reads as itself when it is put back by an Undo.
  return { ...entry, show: (value) => `${l.label} voice: ${value === PHONE_VOICE ? 'Phone default' : String(value)}` };
});

const rateEntries = LANGUAGES.map(
  (l): SettingEntry => ({
    key: `${l.id}Rate`,
    label: `${l.label} speed`,
    hint: `How fast ${l.label} is read aloud; ${DEFAULT_RATE} is normal, smaller is slower.`,
    allowed: { kind: 'number', min: RATE_MIN, max: RATE_MAX, step: RATE_STEP },
    read: () => getSpeechRate(l.id),
    write: async (value) => {
      await setSpeechRate(l.id, Number(value));
      publish({ kind: 'rates-changed', rates: await getSpeechRates() });
    },
    show: (value) => `${l.label} speed ${Number(value)}x`,
  }),
);

/** Every Settings item, in the order the Settings screen draws them. */
export const SETTINGS: readonly SettingEntry[] = [
  choice(
    'theme',
    'Theme',
    'The colours: Phone follows the phone\'s own light or dark setting.',
    THEMES.map((t) => ({ value: t.id, label: t.label })),
    getTheme,
    async (value) => {
      const theme = THEMES.find((t) => t.id === value)?.id ?? 'phone';
      await setTheme(theme);
      publish({ kind: 'theme-changed', theme });
    },
  ),
  choice(
    'textSize',
    'Text size',
    'How big the text is, in steps of the phone\'s own size.',
    TEXT_SIZES.map((t) => ({ value: t.id, label: t.label })),
    async () => textSizeId(await getTextSize()),
    async (value) => {
      const percent = TEXT_SIZES.find((t) => t.id === value)?.percent ?? Number(value);
      await setTextSize(percent);
      publish({ kind: 'text-size-changed', percent: await getTextSize() });
    },
  ),
  choice(
    'layout',
    'Layout',
    'How the verses are set on the page: one per line, or run together in paragraphs.',
    LAYOUTS.map((l) => ({ value: l.id, label: l.label })),
    getLayout,
    async (value) => {
      await setLayout(value as ReadingLayout);
      publish({ kind: 'layout-changed', layout: value as ReadingLayout });
    },
  ),
  choice(
    'sectionHeadings',
    'Section headings',
    'Whether the Bible\'s headings are shown above their verses.',
    [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    getSectionHeadings,
    async (value) => {
      await setSectionHeadings(value as SectionHeadings);
      publish({ kind: 'headings-changed', headings: value as SectionHeadings });
    },
  ),
  choice(
    'weave',
    'Weave',
    'In the English view, whether the Greek of his solid words is shown in place of their English.',
    [
      { value: 'off', label: 'Off' },
      { value: 'solid', label: 'Solid words' },
    ],
    getWeave,
    async (value) => {
      await setWeave(value as Weave);
      publish({ kind: 'weave-changed', weave: value as Weave });
    },
  ),
  ...voiceEntries,
  ...rateEntries,
  choice(
    'greekPronunciation',
    'Greek pronunciation',
    'How Greek is pronounced when it is read aloud.',
    PRONUNCIATIONS.map((p) => ({ value: p.id, label: p.label })),
    getGreekPronunciation,
    async (value) => {
      await setGreekPronunciation(value);
      publish({ kind: 'pronunciation-changed', pronunciation: value });
    },
  ),
];

export const settingOf = (key: string): SettingEntry | undefined => SETTINGS.find((s) => s.key === key);

/** Saves a choice and tells the bus: what the Settings screen does when he taps a control. */
export async function writeSetting(key: string, value: SettingValue): Promise<void> {
  const entry = settingOf(key);
  if (!entry) throw new Error(`no setting called ${key}`);
  await entry.write(value);
}

/** The value a talked `value` stands for, or undefined when the setting does not allow it. */
function allowedValue(entry: SettingEntry, value: unknown): SettingValue | undefined {
  const { allowed } = entry;
  if (allowed.kind === 'choice') return typeof value === 'string' && allowed.values.some((v) => v.value === value) ? value : undefined;
  return typeof value === 'number' && Number.isFinite(value) && value >= allowed.min && value <= allowed.max ? value : undefined;
}

/** One change that was made: what it replaced (`from`), so Undo can put it back. `undone` is set once it has been. */
export interface AppliedChange {
  key: string;
  label: string;
  from: SettingValue;
  to: SettingValue;
  /** 'Greek speed 0.8x': what the talk shows after 'Changed:' */
  shown: string;
  undone?: boolean;
}

export interface ChangeResult {
  applied: AppliedChange[];
  /** one plain sentence for each change that was ignored */
  refused: string[];
}

/** The most changes of one answer that are looked at. */
export const MAX_CHANGES = 10;

const describe = (value: unknown): string => (typeof value === 'string' ? `"${value}"` : String(value));

/** Checks each change the grind asked for against the registry and applies the valid ones in order, one after the other (so a
 * later change of the same setting is from the earlier one). Anything else is ignored and said so in `refused`. */
export async function applyChanges(changes: unknown): Promise<ChangeResult> {
  const result: ChangeResult = { applied: [], refused: [] };
  if (!Array.isArray(changes)) return result;
  for (const change of changes.slice(0, MAX_CHANGES)) {
    const asked = typeof change === 'object' && change !== null ? (change as Record<string, unknown>) : {};
    const entry = typeof asked.key === 'string' ? settingOf(asked.key) : undefined;
    if (typeof asked.key !== 'string' || !('value' in asked)) {
      result.refused.push('A change was left out: it was not a setting and a value.');
    } else if (!entry) {
      result.refused.push(`Left out "${asked.key}": the app has no such setting.`);
    } else {
      const value = allowedValue(entry, asked.value);
      if (value === undefined) {
        result.refused.push(`Left out ${entry.label}: ${describe(asked.value)} is not a value it allows.`);
      } else {
        const from = await entry.read();
        await entry.write(value);
        result.applied.push({ key: entry.key, label: entry.label, from, to: value, shown: entry.show(value) });
      }
    }
  }
  if (changes.length > MAX_CHANGES) result.refused.push(`Left out ${changes.length - MAX_CHANGES} more changes than the app takes at once.`);
  return result;
}

/** Puts back what `change` replaced, the same way it was written. */
export async function undoChange(change: AppliedChange): Promise<void> {
  await settingOf(change.key)?.write(change.from);
}

/** What each setting holds now, as the grind may name it (a voice he chose is 'other'): sent with every talk, so 'slower' is
 * from where it stands. */
export async function currentSettings(): Promise<Record<string, SettingValue>> {
  const entries = await Promise.all(
    SETTINGS.map(async (s) => {
      const value = await s.read();
      const named = s.allowed.kind === 'choice' ? s.allowed.values.some((v) => v.value === value) : true;
      return [s.key, named ? value : 'other'] as const;
    }),
  );
  return Object.fromEntries(entries);
}
