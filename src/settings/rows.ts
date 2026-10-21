// src/settings/rows.ts — the one list of every row the Settings screen has: its key, name, one-line hint, longer help, section and what it
// depends on. The screen draws exactly these rows (src/settings/controls/ has the control of each), the search at its top filters them by
// name and hint, and show-when-on reads `dependsOn` (a detail is drawn only while the setting it depends on is on). The tutor is given
// the same list. A row is a talkable setting (src/settings/registry.ts SETTINGS: it also carries what to read, write and allow, and the
// study-resource switches are among them), Developer mode (found on About, kept outside the registry so the tutor cannot change it) or a link
// to another screen. The tutor may change every row but the last two kinds (tests/unit/settings-registry.test.tsx).
// A new setting is one entry in the registry (with its section) plus its control in src/settings/controls/ (CONTROLS, index.ts); a test fails until both.
import { getDeveloper } from '../data/repositories';
import { SCRIPTS } from '../script/scripts';
import { greekFrom } from './definitions/greekInterest';
import { SETTINGS, settingOf, type Dependency, type SectionId } from './registry';

export interface SettingsSection {
  id: SectionId;
  title: string;
  /** under the title, when the rows do not say it */
  hint?: string;
}

/** The sections, in the order the screen draws them (a group's page draws its own, in this order). */
export const SECTIONS: readonly SettingsSection[] = [
  { id: 'dial', title: 'How much Greek?' },
  { id: 'appearance', title: 'Appearance' },
  { id: 'layout', title: 'Layout' },
  { id: 'reading', title: 'Reading' },
  { id: 'headings', title: 'Section headings' },
  { id: 'immersive', title: 'Immersive reader' },
  { id: 'weave', title: 'Weave' },
  { id: 'newWords', title: 'New words' },
  { id: 'paradigms', title: 'Paradigms' },
  { id: 'goal', title: 'Goal' },
  { id: 'approach', title: 'Grammar approach' },
  { id: 'handwriting', title: 'Handwriting' },
  { id: 'readAloud', title: 'Read aloud' },
  { id: 'readTutor', title: "The tutor's responses" },
  { id: 'askBy', title: 'Asking the tutor' },
  { id: 'talk', title: 'Talk' },
  { id: 'hebrew', title: 'Hebrew in the tutor' },
  { id: 'voices', title: 'Reading voices' },
  { id: 'speed', title: 'Reading speed' },
  { id: 'pronunciation', title: 'Pronunciation' },
  { id: 'resources', title: 'Study resources', hint: 'Links from a word to the tools you own. Only links are added; no lexicon text is kept in Lampas. All start off.' },
  { id: 'logos', title: 'Bible in Logos' },
  { id: 'daily', title: 'Daily', hint: 'What Today holds, and which devotional.' },
  { id: 'tips', title: 'Tips' },
  { id: 'developer', title: 'Developer' },
  { id: 'aboutYou', title: 'About you' },
  { id: 'memory', title: 'Memory' },
  { id: 'studyWay', title: 'My study way' },
  { id: 'more', title: 'More' },
];

/** The sections drawn on the Settings home itself, above the groups, not on a group's page: the Greek dial (mw-3ased2.2). They are in no group. */
export const HOME_SECTIONS: readonly SectionId[] = ['dial'];

/** Whether a row is drawn on the home (the dial), not on a group's page. */
export const isHomeRow = (row: Pick<SettingsRow, 'section'>): boolean => HOME_SECTIONS.includes(row.section);

export type GroupId = 'reading' | 'greek' | 'tutor' | 'listening' | 'daily' | 'study' | 'account' | 'developer';

/** A page of Settings (mw-3ased2.1): the home lists the groups and each opens as a page of its own holding its sections. */
export interface SettingsGroup {
  id: GroupId;
  title: string;
  /** under the title on the home: what is in it */
  hint: string;
  sections: readonly SectionId[];
}

/** The groups, in the order the home lists them, and the one table that says which group a section is in (a unit test fails on a section in none or two).
 *  PROVISIONAL: the grouping is the Builder's, to be amended by the Governor. */
export const GROUPS: readonly SettingsGroup[] = [
  { id: 'reading', title: 'Reading', hint: 'Theme, text size, layout, headings and the Immersive reader.', sections: ['appearance', 'layout', 'reading', 'headings', 'immersive', 'weave'] },
  { id: 'greek', title: 'Greek', hint: 'New words, how much of a paradigm table, your goal, the grammar approach and handwriting.', sections: ['newWords', 'paradigms', 'goal', 'approach', 'handwriting'] },
  { id: 'tutor', title: 'The tutor', hint: 'How the tutor answers, how you ask, how the talk bars work, tips and your study way.', sections: ['readTutor', 'askBy', 'talk', 'hebrew', 'tips', 'studyWay'] },
  { id: 'listening', title: 'Listening', hint: 'Read aloud, the voices, how fast and the accents.', sections: ['readAloud', 'voices', 'speed', 'pronunciation'] },
  { id: 'daily', title: 'Daily', hint: 'What Today holds, and which devotional.', sections: ['daily'] },
  { id: 'study', title: 'Study resources', hint: 'Links to the lexicons, Logos and the works you own.', sections: ['resources', 'logos'] },
  { id: 'account', title: 'Account', hint: 'About you, Memory, asking for more, your requests and About.', sections: ['aboutYou', 'memory', 'more'] },
  { id: 'developer', title: 'Developer', hint: 'For finding faults.', sections: ['developer'] },
];

export const groupById = (id: string): SettingsGroup | undefined => GROUPS.find((g) => g.id === id);

/** The group a section is in. */
export function groupOf(section: SectionId): SettingsGroup {
  if (HOME_SECTIONS.includes(section)) throw new Error(`section ${section} is on the home, in no group`);
  const group = GROUPS.find((g) => g.sections.includes(section));
  if (!group) throw new Error(`section ${section} is in no group`);
  return group;
}

export interface SettingsRow {
  /** a setting's key ('weave'), a resource switch's ('resource.logos') or a link's ('link.words') */
  key: string;
  /** what the row is called: its control's name */
  label: string;
  /** one line under the control, searched with the name */
  hint: string;
  /** the longer explanation, behind the row's 'More help' and given to the tutor */
  help?: string;
  section: SectionId;
  /** the row is a detail of another: drawn only while that one is on */
  dependsOn?: Dependency;
  /** the row sets how the tutor works (the AI: what is sent to the mill): with no licence it is drawn off and greyed, with 'Needs a licence' (mw-8m9dyu.3) */
  ai?: boolean;
}

/** The settings that only matter to the tutor. A new setting for the tutor is listed here, so an unlicensed phone sees it off with 'Needs a licence'. */
const AI_KEYS: ReadonlySet<string> = new Set(['tips', 'readTutor', 'askBy', 'quizGoal', ...SCRIPTS.map((s) => s.settingKey)]);

const LINKS: readonly SettingsRow[] = [
  { key: 'link.aboutyou', label: 'About you', hint: 'Your age, pace and how you learn, so the tutor meets you where you are.', section: 'aboutYou' },
  { key: 'link.memory', label: 'Memory', hint: 'The notes Lampas keeps about you on this phone: read, edit, export and import them.', section: 'memory' },
  { key: 'link.studyway', label: 'My study way', hint: 'The lines you kept about how the tutor quizzes you.', section: 'studyWay' },
  { key: 'link.words', label: 'Words', hint: 'The words you are learning.', section: 'more', dependsOn: greekFrom(1) },
  { key: 'link.review', label: 'Review', hint: 'The words and ideas that are due.', section: 'more', dependsOn: greekFrom(1) },
  { key: 'link.paradigms', label: 'Paradigms', hint: 'Tables of endings, opened as you learn the grammar.', section: 'more', dependsOn: greekFrom(5) },
  { key: 'link.askmore', label: 'Ask for more', hint: 'Ask for an approach, a study resource, a text or a translation Lampas lacks.', section: 'more' },
  { key: 'link.requests', label: 'Your requests', hint: 'What became of the things you asked the factory for.', section: 'more' },
  { key: 'link.about', label: 'About', hint: 'Where the text comes from, and its licences.', section: 'more' },
];

/** The rows that send a request to the factory (Request a devotional): a box, not a setting, so the tutor does not read or change them. */
const REQUESTS: readonly SettingsRow[] = [
  {
    key: 'request.devotional',
    label: 'Request a devotional',
    hint: 'Ask for another devotional to be added to Which devotional.',
    help: 'Type the title of a devotional in your Logos library and Send. The makers add it to the list when they find its Logos id; Your requests follows it. It goes to the factory through the tutor\'s mill, so it needs a licence.',
    section: 'daily',
  },
];

/** Works (mw-5r3p30.675): the commentaries and books of his Logos library that he ticks so the tutor may link them. A list of switches, not a setting, so the tutor does not read or change it (isTalkable). */
const WORKS_ROW: SettingsRow = {
  key: 'works',
  label: 'Works in your Logos library',
  hint: 'The commentaries and books you own. The tutor links only the ones on.',
  help: 'Lampas cannot see your Logos library, so switch on the commentaries and books you own. When the tutor names one of them, it adds an Open in Logos button: a commentary opens at the passage, a book at its start. All start off.',
  section: 'resources',
};

/** Developer mode is found, not set (seven taps on About's version number): its switch is drawn only once it is no longer 'hidden'. */
const DEVELOPER: SettingsRow = {
  key: 'developer',
  label: 'Developer mode',
  hint: "For finding faults: On shows Download my recording under a reading check's result.",
  help: "For finding faults. On shows Download my recording under a reading check's result, to save the clip as it was recorded, and Show the welcome again, which puts the English defaults back and brings the tutor's welcome round again for the demo.",
  section: 'developer',
  dependsOn: { key: 'developerMode', shown: (value) => value === 'on' || value === 'off' },
};

const rowOfSetting = (s: (typeof SETTINGS)[number]): SettingsRow => ({
  key: s.key,
  label: s.label,
  hint: s.hint,
  help: s.help,
  section: s.section,
  dependsOn: s.dependsOn,
  ai: AI_KEYS.has(s.key) || undefined,
});

const unordered: readonly SettingsRow[] = [...SETTINGS.map(rowOfSetting), ...REQUESTS, WORKS_ROW, DEVELOPER, ...LINKS];

/** Every row of Settings, section by section in the screen's order (within a section, in the order they are listed above). */
export const ROWS: readonly SettingsRow[] = SECTIONS.flatMap((section) => unordered.filter((r) => r.section === section.id));

/** Whether the tutor may read and change the row: a setting or a resource switch, not a link, a request box, the list of Works or Developer mode. */
export const isTalkable = (key: string): boolean => !key.startsWith('link.') && !key.startsWith('request.') && key !== 'developer' && key !== 'works';

export const rowOf = (key: string): SettingsRow | undefined => ROWS.find((r) => r.key === key);

/** The values the rows' dependencies read, as text, by row key. */
export type Values = Readonly<Record<string, string>>;

const DEPENDED_ON = [...new Set(ROWS.flatMap((r) => (r.dependsOn ? [r.dependsOn.key] : [])))];

/** The current value of every row some other row depends on: a setting's value as text (a resource switch is 'on' or 'off'). */
export async function readValues(): Promise<Values> {
  const entries = await Promise.all(
    DEPENDED_ON.map(async (key) => {
      if (key === 'developerMode') return [key, await getDeveloper()] as const;
      return [key, String(await settingOf(key)?.read())] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Text as the search compares it: no capitals, no accents. */
export const foldText = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

/** Whether each row's dependency is on, given the values read (a row with no dependency is always on). */
function reading(values: Values, rows: readonly SettingsRow[]) {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const on = (row: SettingsRow): boolean => {
    if (!row.dependsOn) return true;
    const value = values[row.dependsOn.key];
    const parent = byKey.get(row.dependsOn.key);
    return value !== undefined && row.dependsOn.shown(value) && (!parent || on(parent));
  };
  return { byKey, on };
}

/** The rows to draw: those whose dependency is on and, when `query` is not empty, whose name or hint holds it (ignoring capitals and accents).
 *  A row that matches but is hidden by what it depends on is reached through the row that turns it on, which is shown in its place. */
export function visibleRows(values: Values, query: string, rows: readonly SettingsRow[] = ROWS): SettingsRow[] {
  const { byKey, on } = reading(values, rows);
  const q = foldText(query.trim());
  if (q === '') return rows.filter(on);
  const shown = new Set<string>();
  for (const row of rows) {
    if (!foldText(row.label).includes(q) && !foldText(row.hint).includes(q)) continue;
    let at: SettingsRow | undefined = row;
    while (at && !on(at)) at = at.dependsOn ? byKey.get(at.dependsOn.key) : undefined;
    if (at) shown.add(at.key);
  }
  return rows.filter((r) => shown.has(r.key));
}

/** The setting to turn on first for the row `key` to be drawn, when it is a detail of one that is off: the nearest row it depends on that is drawn, whose
 *  value hides it. Undefined when the row is drawn as it is (or is no row of the list). */
export function neededFor(values: Values, key: string, rows: readonly SettingsRow[] = ROWS): SettingsRow | undefined {
  const { byKey, on } = reading(values, rows);
  let at = byKey.get(key);
  if (!at || on(at)) return undefined;
  while (at && !on(at)) at = at.dependsOn ? byKey.get(at.dependsOn.key) : undefined;
  return at;
}

/** The rows to draw at a link to the setting `key` (src/settings/link.ts): what visibleRows gives for `query`, and that row though the query or its
 *  dependency would hide it, with the setting to turn on first (neededFor) beside it. */
export function rowsAt(values: Values, query: string, key: string | null, rows: readonly SettingsRow[] = ROWS): SettingsRow[] {
  const drawn = visibleRows(values, query, rows);
  if (key === null || !rows.some((r) => r.key === key)) return drawn;
  const keep = new Set([...drawn.map((r) => r.key), key]);
  const needed = neededFor(values, key, rows);
  if (needed) keep.add(needed.key);
  return rows.filter((r) => keep.has(r.key));
}

/** The groups the home lists: those with a row drawn, given the values read. Developer is not listed until Developer mode is found (its only row hides until then). */
export function visibleGroups(values: Values, rows: readonly SettingsRow[] = ROWS): SettingsGroup[] {
  const drawn = new Set(visibleRows(values, '', rows).filter((r) => !isHomeRow(r)).map((r) => groupOf(r.section).id));
  return GROUPS.filter((g) => drawn.has(g.id));
}

/** The settings (the rows with a link, src/settings/link.ts) whose name or hint holds `query`, ignoring capitals and accents, for the search that is
 *  one tap away from every screen. A detail that is hidden while its setting is off is found too: its link says what to turn on first. Nothing for an empty query. */
export function searchSettings(query: string, rows: readonly SettingsRow[] = ROWS): SettingsRow[] {
  const q = foldText(query.trim());
  if (q === '') return [];
  return rows.filter((r) => settingOf(r.key) !== undefined && (foldText(r.label).includes(q) || foldText(r.hint).includes(q)));
}
