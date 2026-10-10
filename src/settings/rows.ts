// src/settings/rows.ts — the one list of every row the Settings screen has: its key, name, one-line hint, longer help, section and what it
// depends on. The screen draws exactly these rows (src/settings/controls/ has the control of each), the search at its top filters them by
// name and hint, and show-when-on reads `dependsOn` (a detail is drawn only while the setting it depends on is on). The tutor is given
// the same list. A row is a talkable setting (src/settings/registry.ts SETTINGS: it also carries what to read, write and allow, and the
// study-resource switches are among them), Developer mode (found on About, kept outside the registry so the tutor cannot change it) or a link
// to another screen. The tutor may change every row but the last two kinds (tests/unit/settings-registry.test.tsx).
// A new setting is one entry in the registry (with its section) plus its control in src/settings/controls/ (CONTROLS, index.ts); a test fails until both.
import { getDeveloper } from '../data/repositories';
import { SETTINGS, settingOf, type Dependency, type SectionId } from './registry';

export interface SettingsSection {
  id: SectionId;
  title: string;
  /** under the title, when the rows do not say it */
  hint?: string;
}

/** The sections, in the order the screen draws them. */
export const SECTIONS: readonly SettingsSection[] = [
  { id: 'appearance', title: 'Appearance' },
  { id: 'layout', title: 'Layout' },
  { id: 'headings', title: 'Section headings' },
  { id: 'weave', title: 'Weave' },
  { id: 'newWords', title: 'New words' },
  { id: 'goal', title: 'Goal' },
  { id: 'approach', title: 'Grammar approach' },
  { id: 'readAloud', title: 'Read aloud' },
  { id: 'readTutor', title: "The tutor's responses" },
  { id: 'hebrew', title: 'Hebrew in the tutor' },
  { id: 'voices', title: 'Reading voices' },
  { id: 'speed', title: 'Reading speed' },
  { id: 'pronunciation', title: 'Greek pronunciation' },
  { id: 'resources', title: 'Study resources', hint: 'Links from a word to the tools you own. Only links are added; no lexicon text is kept in Lampas. All start off.' },
  { id: 'logos', title: 'Bible in Logos' },
  { id: 'tips', title: 'Tips' },
  { id: 'developer', title: 'Developer' },
  { id: 'studyWay', title: 'My study way' },
  { id: 'more', title: 'More' },
];

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
}

const LINKS: readonly SettingsRow[] = [
  { key: 'link.studyway', label: 'My study way', hint: 'The lines you kept about how the tutor quizzes you.', section: 'studyWay' },
  { key: 'link.words', label: 'Words', hint: 'The words you are learning.', section: 'more' },
  { key: 'link.review', label: 'Review', hint: 'The words and ideas that are due.', section: 'more' },
  { key: 'link.paradigms', label: 'Paradigms', hint: 'Tables of endings, opened as you learn the grammar.', section: 'more' },
  { key: 'link.about', label: 'About', hint: 'Where the text comes from, and its licences.', section: 'more' },
];

/** Developer mode is found, not set (seven taps on About's version number): its switch is drawn only once it is no longer 'hidden'. */
const DEVELOPER: SettingsRow = {
  key: 'developer',
  label: 'Developer mode',
  hint: "For finding faults: On shows Download my recording under a reading check's result.",
  help: "For finding faults. On shows Download my recording under a reading check's result, to save the clip as it was recorded.",
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
});

const unordered: readonly SettingsRow[] = [...SETTINGS.map(rowOfSetting), DEVELOPER, ...LINKS];

/** Every row of Settings, section by section in the screen's order (within a section, in the order they are listed above). */
export const ROWS: readonly SettingsRow[] = SECTIONS.flatMap((section) => unordered.filter((r) => r.section === section.id));

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

/** The rows to draw: those whose dependency is on and, when `query` is not empty, whose name or hint holds it (ignoring capitals and accents).
 *  A row that matches but is hidden by what it depends on is reached through the row that turns it on, which is shown in its place. */
export function visibleRows(values: Values, query: string, rows: readonly SettingsRow[] = ROWS): SettingsRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const on = (row: SettingsRow): boolean => {
    if (!row.dependsOn) return true;
    const value = values[row.dependsOn.key];
    const parent = byKey.get(row.dependsOn.key);
    return value !== undefined && row.dependsOn.shown(value) && (!parent || on(parent));
  };
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
