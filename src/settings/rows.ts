// src/settings/rows.ts — the one list of every row the Settings screen has: its key, name, one-line hint, longer help, section and what it
// depends on. The screen draws exactly these rows (src/settings/controls/ has the control of each), the search at its top filters them by
// name and hint, and show-when-on reads `dependsOn` (a detail is drawn only while the setting it depends on is on). The tutor is given
// the same list. A row is a talkable setting (src/settings/registry.ts SETTINGS: it also carries what to read, write and allow, and the
// study-resource switches are among them), Developer mode (found on About, kept outside the registry so the tutor cannot change it) or a link
// to another screen. The tutor may change every row but the last two kinds (tests/unit/settings-registry.test.tsx).
// The searching, hiding and ordering are the kit's (pwa-kit/settings: rowsInOrder, visibleRows, neededFor, rowsAt, visibleGroups, searchSettings); what is here is Lampas's own: its
// sections, groups, links and the rows that are not settings, and the same functions with Lampas's list and its Markdown-to-words (helpText.ts) already given.
// A new setting is one entry in the registry (with its section) plus its control in src/settings/controls/ (CONTROLS, index.ts); a test fails until both.
import {
  foldText,
  groupOf as groupIn,
  neededFor as neededIn,
  rowsAt as rowsAtIn,
  rowsInOrder,
  searchSettings as searchIn,
  visibleGroups as visibleGroupsIn,
  visibleRows as visibleRowsIn,
  type SearchOptions,
  type SettingsGroup as KitGroup,
  type SettingsRow as KitRow,
  type SettingsSection as KitSection,
  type Values,
} from 'pwa-kit/settings';
import { getDeveloper } from '../data/repositories';
import { SCRIPTS } from '../script/scripts';
import { resourceOf } from '../resources';
import { resourcesForLevel } from '../resources/resourcesForLevel';
import { greekFrom, type GreekLevel } from './definitions/greekInterest';
import { helpPlain } from './helpText';
import { SETTINGS, settingOf, type SectionId } from './registry';

export type SettingsSection = KitSection<SectionId>;

export { foldText };
export type { Values };

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
export type SettingsGroup = KitGroup<SectionId, GroupId>;

/** The groups, in the order the home lists them, and the one table that says which group a section is in (a unit test fails on a section in none or two).
 *  PROVISIONAL: the grouping is the Builder's, to be amended by the Governor. */
export const GROUPS: readonly SettingsGroup[] = [
  { id: 'reading', title: 'Reading', hint: 'Theme, text size, layout, headings and the Immersive reader.', sections: ['appearance', 'layout', 'reading', 'headings', 'immersive', 'weave'] },
  { id: 'greek', title: 'Greek', hint: 'New words, how much of a paradigm table, your goal, the grammar approach and handwriting.', sections: ['newWords', 'paradigms', 'goal', 'approach', 'handwriting'] },
  { id: 'tutor', title: 'The tutor', hint: 'How the tutor answers, how you ask, how the talk bars work, tips and your study way.', sections: ['readTutor', 'askBy', 'talk', 'hebrew', 'tips', 'studyWay'] },
  { id: 'listening', title: 'Listening', hint: 'Read aloud, the voices, how fast and the accents.', sections: ['readAloud', 'voices', 'speed', 'pronunciation'] },
  { id: 'daily', title: 'Daily', hint: 'What Today holds, and which devotional.', sections: ['daily'] },
  { id: 'study', title: 'Study resources', hint: 'Links to the tools you own, and your Logos library.', sections: ['resources', 'logos'] },
  { id: 'account', title: 'Account', hint: 'About you, Memory, asking for more, your requests and About.', sections: ['aboutYou', 'memory', 'more'] },
  { id: 'developer', title: 'Developer', hint: 'For finding faults.', sections: ['developer'] },
];

export const groupById = (id: string): SettingsGroup | undefined => GROUPS.find((g) => g.id === id);

/** The group a section is in. */
export const groupOf = (section: SectionId): SettingsGroup => groupIn(GROUPS, section, HOME_SECTIONS);

/** A row of Settings (the kit's, over Lampas's sections): `key` is a setting's ('weave'), a resource switch's ('resource.logos') or a link's ('link.words'). */
export type SettingsRow = KitRow<SectionId> & {
  /** the row sets how the tutor works (the AI: what is sent to the mill): with no licence it is drawn off and greyed, with 'Needs a licence' (mw-8m9dyu.3) */
  ai?: boolean;
};

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
  { key: 'link.conversations', label: 'Conversations', hint: 'Every talk you have kept with the tutor: search them and carry one on.', section: 'more' },
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

/** Your Logos library (mw-rfjjzd.5, docs/design/library-at-scale.md 3.8): the one line under Logos that says how many books are on and opens the Library, where the lexicons, grammar books, commentaries and
 *  the rest are chosen. A door, not a setting: the tutor does not read or change it (isTalkable) and learns the shelf as `works`, never as settings. Drawn right after the Logos switch, while Logos is On. */
const LIBRARY_ROW: SettingsRow = {
  key: 'library',
  label: 'Your Logos library',
  hint: 'The books of your Logos library that Lampas opens, and which are on.',
  help: 'Lampas cannot see your Logos library, so you say which books to use. Open it to tick them by hand or to import your list. The word sheet, the idea sheet and the tutor use the ones that are on; the devotionals that are on are the ones Daily draws from.',
  section: 'resources',
  dependsOn: { key: 'resource.logos', shown: (value) => value === 'on' },
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

/** The library row moved to follow the Logos switch (the one it is a detail of), whichever place the switch is in. */
function libraryAfterLogos(rows: readonly SettingsRow[]): SettingsRow[] {
  const library = rows.find((r) => r.key === LIBRARY_ROW.key);
  const rest = rows.filter((r) => r !== library);
  const at = rest.findIndex((r) => r.key === 'resource.logos');
  return library && at >= 0 ? [...rest.slice(0, at + 1), library, ...rest.slice(at + 1)] : [...rows];
}

const unordered: readonly SettingsRow[] = libraryAfterLogos([...SETTINGS.map(rowOfSetting), ...REQUESTS, LIBRARY_ROW, DEVELOPER, ...LINKS]);

/** Every row of Settings, section by section in the screen's order (within a section, in the order they are listed above). */
export const ROWS: readonly SettingsRow[] = rowsInOrder<SectionId, SettingsRow>(SECTIONS, unordered);

/** The rows to draw with the study-resource switches (`resource.<id>`) in the order the Greek dial gives (resourcesForLevel: English and 'both' first between Just English and All in), each
 *  in the place of one of the switches; every other row stays where it is. Hiding a Greek switch at Just English is the row's dependsOn (registry.ts), through the same selector. */
export function orderResourceRows(rows: readonly SettingsRow[], level: GreekLevel): SettingsRow[] {
  const isSwitch = (r: SettingsRow): boolean => r.key.startsWith('resource.');
  const langOf = (r: SettingsRow) => resourceOf(r.key.slice('resource.'.length))?.lang ?? 'both';
  // ordered only: a switch the dial hides is already not among the rows (dependsOn), and one a link forces into view stays
  const ordered = resourcesForLevel(rows.filter(isSwitch), Math.max(level, 1) as GreekLevel, langOf);
  let next = 0;
  return libraryAfterLogos(rows.map((r) => (isSwitch(r) ? ordered[next++] : r)).filter((r): r is SettingsRow => r !== undefined));
}

/** Whether the tutor may read and change the row: a setting or a resource switch, not a link, a request box, the door to his library or Developer mode. */
export const isTalkable = (key: string): boolean => !key.startsWith('link.') && !key.startsWith('request.') && key !== 'developer' && key !== 'library';

export const rowOf = (key: string): SettingsRow | undefined => ROWS.find((r) => r.key === key);

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

/** How the kit's search reads a row's help: as plain words, its Markdown marks not searched (helpText.ts). */
const SEARCH: SearchOptions<SettingsRow> = { plainHelp: helpPlain };

/** The rows to draw: those whose dependency is on and, when `query` is not empty, whose name, hint or help holds it (ignoring capitals and accents).
 *  A row that matches but is hidden by what it depends on is reached through the row that turns it on, which is shown in its place. */
export const visibleRows = (values: Values, query: string, rows: readonly SettingsRow[] = ROWS): SettingsRow[] => visibleRowsIn(rows, values, query, SEARCH);

/** The setting to turn on first for the row `key` to be drawn, when it is a detail of one that is off: the nearest row it depends on that is drawn, whose
 *  value hides it. Undefined when the row is drawn as it is (or is no row of the list). */
export const neededFor = (values: Values, key: string, rows: readonly SettingsRow[] = ROWS): SettingsRow | undefined => neededIn(rows, values, key);

/** The rows to draw at a link to the setting `key` (src/settings/link.ts): what visibleRows gives for `query`, and that row though the query or its
 *  dependency would hide it, with the setting to turn on first (neededFor) beside it. */
export const rowsAt = (values: Values, query: string, key: string | null, rows: readonly SettingsRow[] = ROWS): SettingsRow[] => rowsAtIn(rows, values, query, key, SEARCH);

/** The groups the home lists: those with a row drawn, given the values read. Developer is not listed until Developer mode is found (its only row hides until then). */
export const visibleGroups = (values: Values, rows: readonly SettingsRow[] = ROWS): SettingsGroup[] => visibleGroupsIn(rows, GROUPS, values, HOME_SECTIONS);

/** The settings (the rows with a link, src/settings/link.ts) whose name, hint or help holds `query`, ignoring capitals and accents, for the search that is
 *  one tap away from every screen. A detail that is hidden while its setting is off is found too: its link says what to turn on first. Nothing for an empty query. */
export const searchSettings = (query: string, rows: readonly SettingsRow[] = ROWS): SettingsRow[] =>
  searchIn(rows, query, { ...SEARCH, only: (row) => settingOf(row.key) !== undefined });
