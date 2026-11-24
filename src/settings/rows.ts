// src/settings/rows.ts — the one list of every row the Settings screen has: its key, name, one-line hint, longer help, section and what it
// depends on. The screen draws exactly these rows (src/settings/controls/ has the control of each), the search at its top filters them by
// name and hint, and show-when-on reads `dependsOn` (a detail is drawn only while the setting it depends on is on). The tutor is given
// the same list. A row is a talkable setting (src/settings/registry.ts SETTINGS: it also carries what to read, write and allow, and the
// study-resource switches are among them), Developer mode (found on About, kept outside the registry so the tutor cannot change it) or a link
// to another screen. The tutor may change every row but the last two kinds (tests/unit/settings-registry.test.tsx).
// The searching, hiding and ordering are the kit's (pwa-kit/settings: rowsInOrder, visibleRows, neededFor, rowsAt, visibleGroups, searchSettings); what is here is Lampas's own: its
// sections, groups, links and the rows that are not settings, and the same functions with Lampas's list and its Markdown-to-words (helpText.ts) already given.
// A new setting is one file of src/settings/definitions/ (its registry entry and its row are made from it; it names its section, and for a section no page holds yet its `page` and `sectionTitle`) plus its control in src/settings/controls/ (the file names the rows it draws with `draws`, and CONTROLS, index.ts, gathers them); a test fails until both.
// The rows that are not settings and the doors of the home are files of src/settings/extraRows/, gathered the same way (mw-6ww.175.107).
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
  type SettingsSection as KitSection,
  type Values,
} from 'pwa-kit/settings';
import { resourceOf } from '../resources';
import { resourcesForLevel } from '../resources/resourcesForLevel';
import { DEFINITION_MODULES } from './definitions';
import type { GreekLevel } from './definitions/greekInterest';
import { DEPTH_KEY } from './definitions/interest';
import { SEPARATE_KEYS } from './definitions/pronunciation';
import { EXTRA_MODULES } from './extraRows';
import { derivedOf, doorsOf, extraRowsOf, layoutOf, rowsWith } from './gather';
import { helpPlain } from './helpText';
import type { GroupId } from './define';
import type { DerivedValue, HomeDoor, SettingsRow } from './row';
import { forgetGrownSermonEntries, growSermonEntries, isGrownSermon, SETTINGS, settingOf, type SectionId } from './registry';
import { knownSermonSources, onKnownSermonSources } from '../sermons/known';
import type { KnownSermonSource } from '../data/repositories/sermonSources';

export type { GroupId, HomeDoor, SettingsRow };
export type SettingsSection = KitSection<SectionId>;

export { foldText };
export type { Values };

/** The sections the app lists, in the order the screen draws them; a section a setting brings (define.ts `page`, `sectionTitle`) comes after them (SECTIONS). */
const LISTED_SECTIONS: readonly SettingsSection[] = [
  { id: 'dial', title: 'Your languages' },
  { id: 'appearance', title: 'Appearance' },
  { id: 'layout', title: 'Layout' },
  { id: 'reading', title: 'Reading' },
  { id: 'headings', title: 'Section headings' },
  { id: 'immersive', title: 'Immersive reader' },
  { id: 'weave', title: 'Weave' },
  { id: 'variants', title: 'Variants' },
  { id: 'newWords', title: 'New words' },
  { id: 'paradigms', title: 'Paradigms' },
  { id: 'goal', title: 'Goal' },
  { id: 'approach', title: 'Grammar approach' },
  { id: 'handwriting', title: 'Handwriting' },
  { id: 'keyboards', title: 'Keyboards' },
  { id: 'readAloud', title: 'Read aloud' },
  { id: 'readTutor', title: "The tutor's responses" },
  { id: 'talk', title: 'Talk' },
  { id: 'hebrew', title: 'Hebrew in the tutor' },
  { id: 'voices', title: 'Reading voices' },
  { id: 'speed', title: 'Reading speed' },
  { id: 'pronunciation', title: 'Pronunciation' },
  { id: 'resources', title: 'Study resources', hint: 'Links from a word to the tools you own. Only links are added; no lexicon text is kept in Lampas. All start off.' },
  { id: 'maps', title: 'Maps', hint: 'Which atlases the Maps door and the tutor draw on.' },
  { id: 'themes', title: 'Themes', hint: 'Which topic lists name the themes of a verse and find the sermons on the same theme.' },
  { id: 'sermons', title: 'Sermons', hint: 'Which sermon sources the Sermons door draws on.' },
  { id: 'daily', title: 'Daily', hint: 'What Today holds, and which devotional.' },
  { id: 'devotionalSources', title: 'Devotional sources', hint: 'Which sources a devotional comes from: your Logos library, and Brookfield First.' },
  { id: 'tips', title: 'Tips' },
  { id: 'developer', title: 'Developer' },
  { id: 'aboutYou', title: 'About you' },
  { id: 'memory', title: 'Memory' },
  { id: 'studyWay', title: 'My study way' },
  { id: 'more', title: 'More' },
];

/** The sections drawn on the Settings home itself, above the groups, not on a group's page: the languages he reads with a dial for each (mw-3ased2.2, mw-gdcyf98.2). They are in no group. */
export const HOME_SECTIONS: readonly SectionId[] = ['dial'];

/** Whether a row is drawn on the home (the dial), not on a group's page. */
export const isHomeRow = (row: Pick<SettingsRow, 'section'>): boolean => HOME_SECTIONS.includes(row.section);

/** A page of Settings (mw-3ased2.1): the home lists the groups and each opens as a page of its own holding its sections. */
export type SettingsGroup = KitGroup<SectionId, GroupId>;

/** The groups the app lists, in the order the home lists them, and the one table that says which group a section is in (a unit test fails on a section in none or two); a section a setting brings is added to its `page`'s.
 *  PROVISIONAL: the grouping is the Builder's, to be amended by the Governor. */
const LISTED_GROUPS: readonly SettingsGroup[] = [
  {
    id: 'reading',
    title: 'Reading',
    hint: 'Theme, text size, layout, headings and the Immersive reader.',
    sections: ['appearance', 'layout', 'reading', 'headings', 'immersive', 'weave', 'variants'],
  },
  {
    id: 'greek',
    title: 'Learning',
    hint: 'New words, how much of a paradigm table, your goal, the grammar approach, handwriting, keyboards and Hebrew in the tutor.',
    sections: ['newWords', 'paradigms', 'goal', 'approach', 'handwriting', 'keyboards', 'hebrew'],
  },
  { id: 'tutor', title: 'The tutor', hint: 'How the tutor answers, how the talk bars work, tips and your study way.', sections: ['readTutor', 'talk', 'tips', 'studyWay'] },
  { id: 'listening', title: 'Listening', hint: 'Read aloud, the voices, how fast and the accents.', sections: ['readAloud', 'voices', 'speed', 'pronunciation'] },
  { id: 'daily', title: 'Daily', hint: 'What Today holds, and which devotional.', sections: ['daily', 'devotionalSources'] },
  { id: 'study', title: 'Study resources', hint: 'Links to the study tools you own, Bible in Logos, maps, themes and sermons.', sections: ['resources', 'maps', 'themes', 'sermons'] },
  { id: 'account', title: 'Account', hint: 'About you, Memory, asking for more, your requests, Help and About.', sections: ['aboutYou', 'memory', 'more'] },
  { id: 'developer', title: 'Developer', hint: 'For finding faults.', sections: ['developer'] },
];

const LAYOUT = layoutOf(LISTED_SECTIONS, LISTED_GROUPS, DEFINITION_MODULES, HOME_SECTIONS);

/** The sections, in the order the screen draws them (a group's page draws its own, in this order): the listed ones, then those the settings bring. */
export const SECTIONS: readonly SettingsSection[] = LAYOUT.sections;

/** The groups, in the order the home lists them, each with the sections its page draws. */
export const GROUPS: readonly SettingsGroup[] = LAYOUT.pages;

export const groupById = (id: string): SettingsGroup | undefined => GROUPS.find((g) => g.id === id);

/** The doors of the home (mw-6ww.175.107): rows of the home that open a page of their own and hold no section, row or setting, gathered from src/settings/extraRows/ (What Lampas has counted, mw-6ww.175.87). */
export const DOORS: readonly HomeDoor[] = doorsOf(EXTRA_MODULES);

/** What Lampas has counted: the door of the home that opens #/settings?page=counted (src/settings/extraRows/counted.ts). */
export const COUNTED_DOOR: HomeDoor = DOORS.find((d) => d.id === 'counted') as HomeDoor;

/** The group a section is in. */
export const groupOf = (section: SectionId): SettingsGroup => groupIn(GROUPS, section, HOME_SECTIONS);

export const rowOfSetting = (s: (typeof SETTINGS)[number]): SettingsRow => ({
  key: s.key,
  label: s.label,
  hint: s.hint,
  help: s.help,
  section: s.section,
  dependsOn: s.dependsOn,
  ai: s.ai || undefined,
});

/** The rows that are not settings (a link, a door, a request box, the rows kept outside the registry: Hand, Hidden themes, Sermon sources, Open web sermons in, Read as, Keep on this phone, Developer mode, the Tools doors),
 *  gathered from src/settings/extraRows/ (mw-6ww.175.107): each group at its `place`, after the rows made from the settings, or directly after the row it names. The tutor neither reads nor changes any of them (isTalkable). */
const EXTRAS = extraRowsOf(EXTRA_MODULES);
const EVERY: readonly SettingsRow[] = rowsWith(SETTINGS.map(rowOfSetting), EXTRAS);
const EXTRA_KEYS: ReadonlySet<string> = new Set(EXTRAS.flatMap((g) => g.rows.map((r) => r.key)));

/** The Tools screen's doors (mw-5r3p30.754, his words of 2026-10-24: "things that interact with the Bible but are not the Bible themselves", not settings): the Library, his Verse lists, Memorize, Paradigms, Words and Review, in the order
 *  the screen draws them (src/settings/extraRows/tools.ts). They are rows of the section 'tools', which no Settings group holds, so no Settings page draws them and the tutor neither reads nor changes them (isTalkable); they stay rows so that the same
 *  `dependsOn` hides them (Words and Review below the Curious step, Paradigms below All in, the library while Logos is Off) and the Settings search finds them (visibleToolRows), `ToolsScreen.tsx` draws them
 *  and src/tools.ts says where each opens. */
export const TOOL_ROWS: readonly SettingsRow[] = EVERY.filter((r) => r.section === 'tools');

/** Every row of Settings, section by section in the screen's order (within a section, in the order they are listed above). */
export const ROWS: readonly SettingsRow[] = rowsInOrder<SectionId, SettingsRow>(
  SECTIONS,
  EVERY.filter((r) => r.section !== 'tools'),
);

/** The rows to draw with the study-resource switches (`resource.<id>`) in the order the Greek dial gives (resourcesForLevel: English and 'both' first between Just English and All in), each
 *  in the place of one of the switches; every other row stays where it is. Hiding a Greek switch at Just English is the row's dependsOn (registry.ts), through the same selector. */
export function orderResourceRows(rows: readonly SettingsRow[], level: GreekLevel): SettingsRow[] {
  const isSwitch = (r: SettingsRow): boolean => r.key.startsWith('resource.');
  const langOf = (r: SettingsRow) => resourceOf(r.key.slice('resource.'.length))?.lang ?? 'both';
  // ordered only: a switch the dial hides is already not among the rows (dependsOn), and one a link forces into view stays
  const ordered = resourcesForLevel(rows.filter(isSwitch), Math.max(level, 1) as GreekLevel, langOf);
  // the rows that hang from a switch (Your Logos library and Bible in Logos from Logos) stay directly beneath it, wherever the dial puts it
  const under = (sw: SettingsRow): SettingsRow[] => rows.filter((r) => r.section === sw.section && r.dependsOn?.key === sw.key);
  const hung = new Set(rows.filter(isSwitch).flatMap(under));
  let next = 0;
  return rows.flatMap((r) => {
    if (hung.has(r)) return [];
    if (!isSwitch(r)) return [r];
    const sw = ordered[next++];
    return sw ? [sw, ...under(sw)] : [];
  });
}

/** Whether a row is a sermon source's own switch ('sermons.<id>'): found by the search and changed by the tutor, drawn on the page of sermon sources and not on the Study resources page. */
export const isSermonSourceRow = (row: Pick<SettingsRow, 'key'>): boolean => row.key.startsWith('sermons.');

/** Whether the tutor is told the row as a row of its own: a setting or a resource switch, not a row that is no setting (src/settings/extraRows/: a link, a request box, the door to his library, the door to the sermon sources, Read as,
 *  Keep on this phone, Hand, the Old Testament's and the Apocrypha's Bible in Logos, Developer mode) and not a sermon source's switch (sermons.<id>: the tutor is told ONE summary line for all of them, tutorSettings.ts, mw-qtu3zvz.236). */
export const isTalkable = (key: string): boolean => !EXTRA_KEYS.has(key) && !key.startsWith('link.') && !key.startsWith('request.') && !isSermonSourceRow({ key });

export const rowOf = (key: string): SettingsRow | undefined => ROWS.find((r) => r.key === key);

const grownListeners = new Set<(rows: readonly SettingsRow[]) => void>();
let grownCount = 0;

/** How many times Settings has grown rows (for a hook to read, useSyncExternalStore, src/settings/useGrownRows.ts): a screen draws again when it changes. */
export const grownRowsCount = (): number => grownCount;

/** Calls `listener` with the rows each time Settings grows some; returns the unsubscribe. */
export function onRowsGrown(listener: (rows: readonly SettingsRow[]) => void): () => void {
  grownListeners.add(listener);
  return () => void grownListeners.delete(listener);
}

/**
 * Grows the On | Off row of each sermon source the index service has that the bundle lacks and that has none yet (mw-qtu3zvz.5, docs/sermons.md 'When online'): at the end of the Sermons section, in the order the sources were first seen.
 * ROWS is the one array every screen reads, so it grows in place; the tutor does not read these rows (isTalkable). Returns whether any row was made.
 */
export function growSermonRows(known: readonly KnownSermonSource[]): boolean {
  const rows = growSermonEntries(known).map(rowOfSetting);
  if (rows.length === 0) return false;
  const all = ROWS as SettingsRow[];
  const after = all.reduce((at, r, i) => (r.section === 'sermons' ? i : at), all.length - 1);
  all.splice(after + 1, 0, ...rows);
  grownCount++;
  for (const listener of [...grownListeners]) listener(rows);
  return true;
}

/** Takes the grown rows out again and forgets their entries (a test starts over). */
export function forgetGrownSermonRows(): void {
  const all = ROWS as SettingsRow[];
  for (let i = all.length - 1; i >= 0; i--) if (isGrownSermon(all[i].key)) all.splice(i, 1);
  forgetGrownSermonEntries();
}

// the rows of sources already known, and each one the service tells of later
growSermonRows(knownSermonSources());
onKnownSermonSources(growSermonRows);

/** The values a row depends on that no setting holds, gathered from the files of src/settings/definitions/ and src/settings/extraRows/ (mw-6ww.175.112). */
const DERIVED = derivedOf(DEFINITION_MODULES, EXTRA_MODULES);

/** The keys some row of `rows` depends on, once each. */
const dependedOn = (rows: readonly SettingsRow[]): string[] => [...new Set(rows.flatMap((r) => (r.dependsOn ? [r.dependsOn.key] : [])))];

/** The current value of every row some other row depends on: a setting's value as text (a resource switch is 'on' or 'off'). `rows` and `derived` are the real ones; a test gives its own (mw-6ww.175.112). */
export async function readValues(rows: readonly SettingsRow[] = [...ROWS, ...TOOL_ROWS], derived: readonly DerivedValue[] = DERIVED): Promise<Values> {
  // the sermon sources the index service gave on an earlier day have their rows before the screen draws (growSermonRows); the screen draws once the values are read
  const entries = await Promise.all(
    dependedOn(rows).map(async (key) => {
      // a value no setting holds (the higher of the two dials, a pair of settings both On, Developer mode, a sermon source his import holds): a file of definitions/ or extraRows/ derives it (row.ts derivedValue)
      const own = derived.find((d) => d.matches(key));
      if (own) return [key, await own.read(key, async (name) => settingOf(name)?.read())] as const;
      return [key, String(await settingOf(key)?.read())] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** How the kit's search reads a row's help: as plain words, its Markdown marks not searched (helpText.ts). */
const SEARCH: SearchOptions<SettingsRow> = { plainHelp: helpPlain };

/** The dial a row follows, through the rows it is a detail of: 'greekInterest', 'hebrewInterest' or 'depth' (the higher of the two); undefined for a row no dial decides. */
export function dialOf(row: SettingsRow): 'greekInterest' | 'hebrewInterest' | 'depth' | undefined {
  let at: SettingsRow | undefined = row;
  const ends: readonly string[] = ['greekInterest', 'hebrewInterest', DEPTH_KEY, SEPARATE_KEYS.grc, SEPARATE_KEYS.he];
  while (at?.dependsOn && !ends.includes(at.dependsOn.key)) at = rowOf(at.dependsOn.key);
  const key = at?.dependsOn?.key;
  if (key === SEPARATE_KEYS.grc) return 'greekInterest';
  if (key === SEPARATE_KEYS.he) return 'hebrewInterest';
  return key === 'greekInterest' || key === 'hebrewInterest' || key === DEPTH_KEY ? key : undefined;
}

/** The rows to draw: those whose dependency is on and, when `query` is not empty, whose name, hint or help holds it (ignoring capitals and accents).
 *  A row that matches but is hidden by what it depends on is reached through the row that turns it on, which is shown in its place. A row both languages share is hidden by
 *  `depth`, which is read and not drawn, so there is no row to reach it through: the dial that is drawn stands in for it, or 'Which languages?' while none is. */
export const visibleRows = (values: Values, query: string, rows: readonly SettingsRow[] = ROWS): SettingsRow[] => {
  const found = visibleRowsIn(rows, values, query, SEARCH);
  if (query.trim() === '') return found;
  const drawn = new Set(visibleRowsIn(rows, values, '', SEARCH).map((r) => r.key));
  if (!searchIn(rows, query, SEARCH).some((r) => dialOf(r) === DEPTH_KEY && !drawn.has(r.key))) return found;
  const dials = rows.filter((r) => (r.key === 'greekInterest' || r.key === 'hebrewInterest') && drawn.has(r.key));
  const standIn = new Set([...found.map((r) => r.key), ...(dials.length > 0 ? dials : rows.filter((r) => r.key === 'languages')).map((r) => r.key)]);
  return rows.filter((r) => standIn.has(r.key));
};

/** The setting to turn on first for the row `key` to be drawn, when it is a detail of one that is off: the nearest row it depends on that is drawn, whose
 *  value hides it. Undefined when the row is drawn as it is (or is no row of the list). */
export const neededFor = (values: Values, key: string, rows: readonly SettingsRow[] = ROWS): SettingsRow | undefined => neededIn(rows, values, key);

/** The rows to draw at a link to the setting `key` (src/settings/link.ts): what visibleRows gives for `query`, and that row though the query or its
 *  dependency would hide it, with the setting to turn on first (neededFor) beside it. */
export const rowsAt = (values: Values, query: string, key: string | null, rows: readonly SettingsRow[] = ROWS): SettingsRow[] => rowsAtIn(rows, values, query, key, SEARCH);

/** The Tools the Settings search finds for `query`, drawn (no query) or searched by name, hint and help, hidden by the same dials and the Logos switch as in Settings. The Tools screen calls it with no query. */
export const visibleToolRows = (values: Values, query: string): SettingsRow[] => {
  const shown = new Set(TOOL_ROWS.map((r) => r.key));
  return visibleRows(values, query, [...ROWS, ...TOOL_ROWS]).filter((r) => shown.has(r.key));
};

/** The groups the home lists: those with a row drawn, given the values read. Developer is not listed until Developer mode is found (its only row hides until then). */
export const visibleGroups = (values: Values, rows: readonly SettingsRow[] = ROWS): SettingsGroup[] => visibleGroupsIn(rows, GROUPS, values, HOME_SECTIONS);

/** What the home lists under the dials, in order: the groups with a row drawn, and each door of the home before the group it names (What Lampas has counted: last before Developer), last when that group is not listed (last of all until Developer mode is found). */
export function homeEntries(values: Values, rows: readonly SettingsRow[] = ROWS, doors: readonly HomeDoor[] = DOORS): (SettingsGroup | HomeDoor)[] {
  const entries: (SettingsGroup | HomeDoor)[] = [...visibleGroups(values, rows)];
  for (const door of doors) {
    const at = door.before === undefined ? -1 : entries.findIndex((e) => e.id === door.before);
    entries.splice(at < 0 ? entries.length : at, 0, door);
  }
  return entries;
}

/** The doors of the home the Settings search finds for `query` (mw-6ww.175.103): a door whose title or hint holds it, ignoring capitals and accents as a row's
 *  name and hint are searched. It is no row of ROWS, so visibleRows never answers it. Nothing for an empty query. PROVISIONAL: the Tester's suggestion, released by the Mayor, the Governor to confirm. */
export function foundDoors(query: string): HomeDoor[] {
  const q = foldText(query.trim());
  return q === '' ? [] : DOORS.filter((door) => [door.title, door.hint].some((text) => foldText(text).includes(q)));
}

/** The settings (the rows with a link, src/settings/link.ts) whose name, hint or help holds `query`, ignoring capitals and accents, for the search that is
 *  one tap away from every screen. A detail that is hidden while its setting is off is found too: its link says what to turn on first. Nothing for an empty query. */
export const searchSettings = (query: string, rows: readonly SettingsRow[] = ROWS): SettingsRow[] => searchIn(rows, query, { ...SEARCH, only: (row) => settingOf(row.key) !== undefined });
