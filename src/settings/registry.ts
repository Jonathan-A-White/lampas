// src/settings/registry.ts — every Settings item the app has, as a list: its key, its label, a one-line hint, longer help, the section
// it sits in, the setting it depends on, the values it allows, and how to read and write it. src/settings/rows.ts adds the rows that
// are not talkable (the study-resource switches, the links) and is the one list the Settings screen draws, searches and hides from. Writing saves the choice (src/data/repositories) and tells the bus, which is all the Settings screen does
// when he taps (it calls `write` here), so a change he asks for in the Bible talk takes the same path. The bible-talk grind is
// told this list (src/settings/grindText.ts builds its schema and instructions from it): a new setting is talkable by adding it
// here, and tests/unit/settings-registry.test.tsx fails if a control of the Settings screen has no entry.
import { TEXT_SIZES } from '../appearance/textSizes';
import { THEMES } from '../appearance/themes';
import {
  getGoal,
  getGrammarApproach,
  getGrammarMove,
  getPickerGrammar,
  getGreekPronunciation,
  getLayout,
  getReadSpan,
  getReadTutor,
  getScriptDepth,
  getLogosBible,
  getNewWordsADay,
  getSectionHeadings,
  getSpeechRate,
  getSpeechRates,
  getTextSize,
  getTheme,
  getTips,
  getVoice,
  getWeave,
  getWeaveGrammar,
  setGoal,
  setGrammarApproach,
  setGrammarMove,
  setPickerGrammar,
  setGreekPronunciation,
  setLayout,
  setReadSpan,
  setReadTutor,
  setScriptDepth,
  setLogosBible,
  setNewWordsADay,
  setSectionHeadings,
  setSpeechRate,
  setTextSize,
  setTheme,
  setTips,
  setVoice,
  setWeave,
  setWeaveGrammar,
  type GrammarMove,
  type PickerGrammar,
  type ReadingLayout,
  type ReadTutor,
  type SectionHeadings,
  type Tips,
  type Weave,
  type WeaveGrammar,
} from '../data/repositories';
import { APPROACHES, DEFAULT_APPROACH, approachOf } from '../approaches';
import { BOOK_INDEX } from '../data/bookIndex';
import { goalTitle, parseGoal } from '../data/goal';
import { normaliseNewWordsADay } from '../data/pace';
import { publish } from '../events/bus';
import { LAYOUTS } from '../layout/layouts';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, RATE_STEP } from '../speech/languages';
import { COMMON_BIBLES, DEFAULT_LOGOS_BIBLE, isResourceId } from '../resources/logosBible';
import { READ_SPANS, type ReadSpan } from '../speech/readSpan';
import { PRONUNCIATIONS } from '../speech/pronunciation';
import { DEFAULT_DEPTH, DEPTHS, SCRIPTS, type Depth } from '../script/scripts';

/** The longest text a talked change of a text setting may hold (the grind's schema says the same). */
export const TEXT_MAX = 80;

/** What a setting holds: a choice's value (text) or a speed (number). */
export type SettingValue = string | number;

/** The voice value that means the phone's own pick; a voice he chose in Settings is its voiceURI, which a talk cannot name. */
export const PHONE_VOICE = 'default';

export type Allowed =
  | { kind: 'choice'; values: readonly { value: string; label: string }[] }
  | { kind: 'number'; min: number; max: number; step: number }
  /** free text the entry checks itself: `valid` takes the text a person or the tutor wrote; `example` is one it takes */
  | { kind: 'text'; valid(value: string): boolean; example: string };

/** The sections of the Settings screen, in the order it draws them (src/settings/rows.ts SECTIONS has their titles). */
export type SectionId =
  | 'appearance'
  | 'layout'
  | 'headings'
  | 'weave'
  | 'newWords'
  | 'goal'
  | 'approach'
  | 'readAloud'
  | 'voices'
  | 'speed'
  | 'pronunciation'
  | 'resources'
  | 'logos'
  | 'tips'
  | 'studyWay'
  | 'more';

/** A row that is a detail of another: shown only while `shown(value)` says so of the other's value (as text: 'off', '0', 'on'). */
export interface Dependency {
  /** the other row's key: a setting's, or 'resource.<id>' for a study resource's switch */
  key: string;
  shown(value: string): boolean;
}

/** What the Settings screen needs of a row besides its control. */
export interface RowMeta {
  section: SectionId;
  /** the longer explanation, for the tutor and the row's 'More help' */
  help?: string;
  dependsOn?: Dependency;
}

export interface SettingEntry extends RowMeta {
  /** what the grind and `settings_changes` call it: 'greekRate' */
  key: string;
  /** what the Settings screen calls it (the name of its control): 'Greek speed' */
  label: string;
  /** one line (at most 90 characters) under the control, searched with the name: what it does */
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
  meta: RowMeta,
): SettingEntry {
  return {
    ...meta,
    key,
    label,
    hint,
    allowed: { kind: 'choice', values },
    read,
    write: (value) => write(String(value)),
    show: (value) => `${label}: ${values.find((v) => v.value === value)?.label ?? String(value)}`,
  };
}

// One depth setting per script the tutor writes (src/script/scripts.ts): Hebrew's is 'hebrewDepth', Settings > Hebrew in the tutor.
const depthEntries = SCRIPTS.map((script) =>
  choice(
    script.settingKey,
    script.settingLabel,
    `How deep into ${script.label} the tutor goes when it writes a ${script.label} word: ${DEPTHS.map((d) => `${d.id} (${d.label}) writes it like ${script.examples[d.id]}`).join('; ')}. ${DEPTHS.find((d) => d.id === DEFAULT_DEPTH)?.label} by default.`,
    DEPTHS.map((d) => ({ value: d.id, label: d.label })),
    () => getScriptDepth(script),
    async (value) => {
      await setScriptDepth(script, value as Depth);
      publish({ kind: 'script-depth-changed', script: script.id, depth: value as Depth });
    },
  ),
);

const textSizeId = (percent: number): SettingValue => TEXT_SIZES.find((t) => t.percent === percent)?.id ?? percent;

const voiceEntries = LANGUAGES.map((l): SettingEntry => {
  const entry = choice(
    `${l.id}Voice`,
    `${l.label} voice`,
    `Which voice reads ${l.label} aloud.`,
    [{ value: PHONE_VOICE, label: 'Phone default' }],
    async () => (await getVoice(l.id)) ?? PHONE_VOICE,
    async (value) => {
      const voice = value === PHONE_VOICE || value === '' ? null : value;
      await setVoice(l.id, voice);
      const other = await getVoice(l.id === 'english' ? 'greek' : 'english');
      publish({ kind: 'voices-changed', english: l.id === 'english' ? voice : other, greek: l.id === 'greek' ? voice : other });
    },
    {
      section: 'voices',
      help: "Phone default lets the phone choose. Only the phone's own pick can be asked for; the other voices are the phone's.",
    },
  );
  // A voice he chose reads as itself when it is put back by an Undo.
  return { ...entry, show: (value) => `${l.label} voice: ${value === PHONE_VOICE ? 'Phone default' : String(value)}` };
});

const rateEntries = LANGUAGES.map(
  (l): SettingEntry => ({
    section: 'speed',
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

// The goal is checked against the committed index (src/data/bookIndex.ts), so a book, chapter or verse the text lacks is refused at once.
const INDEX = BOOK_INDEX;

/** The goal text names, as `parseGoal` reads it; '' is no goal. */
const goalOf = (value: string) => (value.trim() === '' ? null : (parseGoal(value, INDEX) ?? null));

const goalEntry: SettingEntry = {
  section: 'goal',
  key: 'goal',
  label: 'Goal',
  hint: 'The passage you are working toward: a book, a chapter or a verse.',
  allowed: { kind: 'text', valid: (value) => value.trim() === '' || goalOf(value) !== null, example: '1 John 1:1' },
  read: getGoal,
  write: async (value) => {
    const goal = goalOf(String(value));
    await setGoal(goal ? goalTitle(goal, INDEX) : '');
    publish({ kind: 'goal-changed', goal });
  },
  show: (value) => {
    const goal = goalOf(String(value));
    return `Goal: ${goal ? goalTitle(goal, INDEX) : 'none'}`;
  },
};

const logosBibleEntry: SettingEntry = {
  section: 'logos',
  dependsOn: { key: 'resource.logos', shown: (value) => value === 'on' },
  key: 'logosBible',
  label: 'Bible in Logos',
  hint: 'The Bible that Old Testament chapters open in, in Logos.',
  help: `The Bible in your Logos library that Old Testament chapters open in, named by its Resource ID, such as ${DEFAULT_LOGOS_BIBLE} (the Legacy Standard Bible). Lampas has no Old Testament text; it shows only while Logos is On.`,
  allowed: { kind: 'text', valid: isResourceId, example: DEFAULT_LOGOS_BIBLE },
  read: getLogosBible,
  write: async (value) => {
    await setLogosBible(String(value));
  },
  show: (value) => `Bible in Logos: ${COMMON_BIBLES.find((b) => b.id === value)?.name ?? String(value)}`,
};

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

/** Every talkable Settings item. (The screen draws them in src/settings/rows.ts's order, section by section.) */
export const SETTINGS: readonly SettingEntry[] = [
  choice(
    'theme',
    'Theme',
    "Light, dark, or the phone's own.",
    THEMES.map((t) => ({ value: t.id, label: t.label })),
    getTheme,
    async (value) => {
      const theme = THEMES.find((t) => t.id === value)?.id ?? 'phone';
      await setTheme(theme);
      publish({ kind: 'theme-changed', theme });
    },
    { section: 'appearance', help: "The colours: Phone follows the phone's own light or dark setting." },
  ),
  choice(
    'textSize',
    'Text size',
    "How big the text is, in steps of the phone's own size.",
    TEXT_SIZES.map((t) => ({ value: t.id, label: t.label })),
    async () => textSizeId(await getTextSize()),
    async (value) => {
      const percent = TEXT_SIZES.find((t) => t.id === value)?.percent ?? Number(value);
      await setTextSize(percent);
      publish({ kind: 'text-size-changed', percent: await getTextSize() });
    },
    { section: 'appearance' },
  ),
  choice(
    'layout',
    'Layout',
    'Verses one per line, or run together in paragraphs.',
    LAYOUTS.map((l) => ({ value: l.id, label: l.label })),
    getLayout,
    async (value) => {
      await setLayout(value as ReadingLayout);
      publish({ kind: 'layout-changed', layout: value as ReadingLayout });
    },
    {
      section: 'layout',
      help: 'How the verses are set on the page. Verse by verse is one verse per line. Paragraph runs the verses of a paragraph together, with small verse numbers.',
    },
  ),
  choice(
    'sectionHeadings',
    'Section headings',
    "The Bible's headings above their verses, shown or not.",
    ON_OFF,
    getSectionHeadings,
    async (value) => {
      await setSectionHeadings(value as SectionHeadings);
      publish({ kind: 'headings-changed', headings: value as SectionHeadings });
    },
    { section: 'headings' },
  ),
  choice(
    'readSpan',
    'Read aloud span',
    'How far Play reads aloud before it stops.',
    READ_SPANS.map((s) => ({ value: s.id, label: s.label })),
    getReadSpan,
    async (value) => {
      await setReadSpan(value as ReadSpan);
      publish({ kind: 'read-span-changed', span: value as ReadSpan });
    },
    {
      section: 'readAloud',
      help: `How far the app reads aloud before it stops, from the verse it starts at (the play button on one verse always reads just that verse): ${READ_SPANS.map((s) => `${s.label} stops ${s.stops}`).join('; ')}.`,
    },
  ),
  choice(
    'readTutor',
    "Read the tutor's responses aloud",
    "Whether the tutor's responses are spoken the moment they arrive, with no tap: the reading check's verdict (its heading, its note and each word to fix with its tip, never the verse itself) and the answers to what he asks. On by default; Off speaks nothing by itself (the speaker on an answer still reads it).",
    [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    getReadTutor,
    async (value) => {
      await setReadTutor(value as ReadTutor);
      publish({ kind: 'read-tutor-changed', readTutor: value as ReadTutor });
    },
  ),
  ...depthEntries,
  choice(
    'tips',
    'Tips',
    'One small tip a day, from what you use.',
    ON_OFF,
    getTips,
    async (value) => {
      await setTips(value as Tips);
      publish({ kind: 'tips-changed', tips: value as Tips });
    },
    {
      section: 'tips',
      help: 'Whether Lampas may offer one small tip a day, from what you use, to help you get more from the app. Once a day at most, when you open Lampas and are online. On by default; Off sends nothing.',
    },
  ),
  choice(
    'weave',
    'Weave',
    'The Greek of your words in place of their English.',
    [
      { value: 'off', label: 'Off' },
      { value: 'solid', label: 'Solid' },
      { value: 'solid+learning', label: '+ Learning' },
    ],
    getWeave,
    async (value) => {
      await setWeave(value as Weave);
      publish({ kind: 'weave-changed', weave: value as Weave });
    },
    {
      section: 'weave',
      help: 'In the English view, whether the Greek of his solid words, and of the words he is learning with their English beneath in small grey, is shown in place of their English. Solid shows the solid ones; + Learning shows the ones being learned too, with their English beneath in small grey until they turn solid.',
    },
  ),
  choice(
    'weaveGrammar',
    'Grammar',
    'Keep only forms whose grammar you have.',
    [
      { value: 'any', label: 'Any' },
      { value: 'solid', label: 'Solid' },
      { value: 'solid+frontier', label: '+ Frontier' },
    ],
    getWeaveGrammar,
    async (value) => {
      await setWeaveGrammar(value as WeaveGrammar);
      publish({ kind: 'weave-grammar-changed', grammar: value as WeaveGrammar });
    },
    {
      section: 'weave',
      dependsOn: { key: 'weave', shown: (value) => value !== 'off' },
      help: 'Of the words that stand in Greek, keep only the forms whose grammar you have at this level: Any, Solid, or Solid and frontier. It shows only while the Weave is not Off.',
    },
  ),
  choice(
    'newWordsADay',
    'New words a day',
    'How many new words are offered a day.',
    [
      { value: '0', label: 'Off' },
      { value: '3', label: '3' },
      { value: '5', label: '5' },
      { value: '10', label: '10' },
    ],
    async () => String(await getNewWordsADay()),
    async (value) => {
      await setNewWordsADay(normaliseNewWordsADay(value));
    },
    {
      section: 'newWords',
      help: 'From the chapter you are reading, most common first. Off offers none; the app offers none while many reviews are due or the last round went badly, and one notch more after a clean week.',
    },
  ),
  choice(
    'pickerGrammar',
    'New words at',
    'Offer new words by the grammar of their form.',
    [
      { value: 'solid', label: 'Solid grammar' },
      { value: 'frontier', label: 'Frontier grammar' },
    ],
    getPickerGrammar,
    async (value) => {
      await setPickerGrammar(value as PickerGrammar);
    },
    {
      section: 'newWords',
      dependsOn: { key: 'newWordsADay', shown: (value) => value !== '0' },
      help: 'Offer only new words whose form in the chapter uses grammar you have at this level. It shows only while New words a day is not Off.',
    },
  ),
  choice(
    'grammarMove',
    'Move it',
    'Whether the app moves that level for you.',
    [
      { value: 'ask', label: 'Ask' },
      { value: 'auto', label: 'Auto' },
      { value: 'off', label: 'Off' },
    ],
    getGrammarMove,
    async (value) => {
      await setGrammarMove(value as GrammarMove);
    },
    {
      section: 'newWords',
      dependsOn: { key: 'newWordsADay', shown: (value) => value !== '0' },
      help: 'Whether the app moves New words at by how your grammar reviews go: Ask offers, Auto moves and says so, Off never. It shows only while New words a day is not Off.',
    },
  ),
  goalEntry,
  choice(
    'grammarApproach',
    'Grammar approach',
    'The order grammar is taught and tested in.',
    APPROACHES.map((a) => ({ value: a.id, label: a.name })),
    getGrammarApproach,
    async (value) => {
      const approach = approachOf(value)?.id ?? DEFAULT_APPROACH;
      await setGrammarApproach(approach);
      publish({ kind: 'approach-changed', approach });
    },
    { section: 'approach' },
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
    { section: 'pronunciation' },
  ),
  logosBibleEntry,
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
  if (allowed.kind === 'text') return typeof value === 'string' && value.length <= TEXT_MAX && allowed.valid(value) ? value : undefined;
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
