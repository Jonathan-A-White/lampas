// src/settings/gather.ts — the settings lists, gathered from the files of src/settings/definitions/ (and src/settings/entries/) by glob, so a new setting is one new file and edits no list
// (mw-6ww.175.105, slice 1 of the Lampas registry). A module's exports are looked at one by one: a setting declared with defineSetting (it has `key` and `parse`) is in DEFINITIONS and makes its registry entry (unless one is made by hand in src/settings/entries/); an EntryGroup (src/settings/entry.ts slotted) is an entry made by hand. Both lists are in order: the number `order` or `slot` says,
// lowest first, then by key; one with no number comes after all that have one.
import type { SettingDef, SettingValue } from './define';
import type { Control, ControlGroup } from './controls/types';
import type { EntryGroup, SettingEntry } from './entry';
import type { GroupId, SectionId } from './define';
import type { ExtraRows, HomeDoor, SettingsRow } from './row';

/** The exports of each file, as import.meta.glob(..., { eager: true }) gives them. */
export type Modules = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

const exportsOf = (modules: Modules): unknown[] =>
  Object.keys(modules)
    .sort()
    .flatMap((file) => Object.values(modules[file]));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** A setting declared with defineSetting (the kit's checks make `key`, `label`, `allowed` and `parse` sure). */
export const isDefinition = (value: unknown): value is SettingDef<SettingValue> => isRecord(value) && typeof value.key === 'string' && typeof value.parse === 'function' && isRecord(value.allowed);

/** An entry group, as src/settings/entry.ts slotted makes it. */
export const isEntryGroup = (value: unknown): value is EntryGroup => isRecord(value) && typeof value.slot === 'number' && Array.isArray(value.entries);

const rank = (n: number | undefined): number => n ?? Number.POSITIVE_INFINITY;

/** Sorts by the number first, then the text; the sort is stable, so equal ones keep the file order. */
function sorted<T>(items: readonly T[], number: (item: T) => number | undefined, text: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const [x, y] = [rank(number(a)), rank(number(b))];
    if (x !== y) return x < y ? -1 : 1;
    const [s, t] = [text(a), text(b)];
    return s < t ? -1 : s > t ? 1 : 0;
  });
}

/** Every setting declared in the modules and not kept outside (`outside`), each once, in `order`. */
export function definitionsOf(modules: Modules): SettingDef<SettingValue>[] {
  const found = new Map<string, SettingDef<SettingValue>>();
  for (const value of exportsOf(modules)) if (isDefinition(value) && value.outside === undefined) found.set(value.key, value);
  return sorted(
    [...found.values()],
    (d) => d.order,
    (d) => d.key,
  );
}

/** The registry's entries, in `slot` order: those of the declared settings that have a slot (made by `make`), and the entry groups of `entryModules`. */
export function entriesOf(definitionModules: Modules, entryModules: Modules, make: (def: SettingDef<SettingValue>) => SettingEntry): SettingEntry[] {
  type Placed = { slot: number | undefined; key: string; entries: readonly SettingEntry[] };
  const placed: Placed[] = [];
  const byHand = new Set<string>();
  const seen = new Set<unknown>();
  for (const value of exportsOf(entryModules)) {
    if (!isEntryGroup(value) || seen.has(value)) continue;
    seen.add(value);
    for (const entry of value.entries) byHand.add(entry.key);
    placed.push({ slot: value.slot, key: value.entries[0]?.key ?? '', entries: value.entries });
  }
  // a declared setting whose entry is not made by hand has one made from it, at its slot (none: after all that have one)
  for (const def of definitionsOf(definitionModules)) if (!byHand.has(def.key)) placed.push({ slot: def.slot, key: def.key, entries: [make(def)] });
  return sorted(
    placed,
    (p) => p.slot,
    (p) => p.key,
  ).flatMap((p) => p.entries);
}

/** A control and the rows it draws, as src/settings/controls/types.ts `draws` makes it. */
export const isControlGroup = (value: unknown): value is ControlGroup =>
  isRecord(value) && value.drawsRows === true && typeof value.control === 'function' && Array.isArray(value.keys) && Array.isArray(value.prefixes);

/**
 * The control of each row, by the row's key, from the control files' exports (mw-6ww.175.106): a group's `keys` are drawn by its control, and so is each row of `rowKeys` that starts with one of its `prefixes`.
 * Two controls for one key is a mistake and throws, naming the key.
 */
export function controlsOf(modules: Modules, rowKeys: readonly string[]): Record<string, Control> {
  const found: Record<string, Control> = {};
  const claim = (key: string, control: Control): void => {
    if (key in found && found[key] !== control) throw new Error(`two controls draw the row '${key}': a row has one control (src/settings/controls/)`);
    found[key] = control;
  };
  const seen = new Set<unknown>();
  for (const value of exportsOf(modules)) {
    if (!isControlGroup(value) || seen.has(value)) continue;
    seen.add(value);
    for (const key of value.keys) claim(key, value.control);
    for (const prefix of value.prefixes) for (const key of rowKeys) if (key.startsWith(prefix)) claim(key, value.control);
  }
  return found;
}

/** Rows that are not settings, as src/settings/row.ts extraRows makes them. */
export const isExtraRows = (value: unknown): value is ExtraRows => isRecord(value) && value.extraRows === true && typeof value.place === 'number' && Array.isArray(value.rows);

/** A door of the Settings home, as src/settings/row.ts homeDoor makes it. */
export const isHomeDoor = (value: unknown): value is HomeDoor => isRecord(value) && value.homeDoor === true && typeof value.id === 'string';

/** The rows that are not settings of the modules (mw-6ww.175.107), in `place` order, then by the first key; each file's group once. */
export function extraRowsOf(modules: Modules): ExtraRows[] {
  const seen = new Set<unknown>();
  const groups: ExtraRows[] = [];
  for (const value of exportsOf(modules)) {
    if (!isExtraRows(value) || seen.has(value)) continue;
    seen.add(value);
    groups.push(value);
  }
  return sorted(
    groups,
    (g) => g.place,
    (g) => g.rows[0]?.key ?? '',
  );
}

/**
 * Every row of Settings before the sections order them: the rows made from the settings, then each group of extra rows, `after` the row it names when it names one (a group that names a row that is
 * not there is a mistake and throws, naming it).
 */
export function rowsWith(settingRows: readonly SettingsRow[], extras: readonly ExtraRows[]): SettingsRow[] {
  const all = [...settingRows, ...extras.filter((g) => g.after === undefined).flatMap((g) => g.rows)];
  for (const group of extras.filter((g) => g.after !== undefined)) {
    const at = all.findIndex((r) => r.key === group.after);
    if (at < 0) throw new Error(`rows '${group.rows.map((r) => r.key).join("', '")}' come after the row '${group.after}', which is not a row of Settings`);
    all.splice(at + 1, 0, ...group.rows);
  }
  const keys = all.map((r) => r.key);
  const twice = keys.find((key, i) => keys.indexOf(key) !== i);
  if (twice !== undefined) throw new Error(`two rows of Settings have the key '${twice}'`);
  return all;
}

/** The doors of the Settings home in the modules, in file order; one id twice is a mistake and throws. */
export function doorsOf(modules: Modules): HomeDoor[] {
  const seen = new Set<unknown>();
  const doors: HomeDoor[] = [];
  for (const value of exportsOf(modules)) {
    if (!isHomeDoor(value) || seen.has(value)) continue;
    seen.add(value);
    doors.push(value);
  }
  const twice = doors.find((d, i) => doors.findIndex((other) => other.id === d.id) !== i);
  if (twice) throw new Error(`two doors of the Settings home have the id '${twice.id}'`);
  return doors;
}

/** A section of the Settings screen and a page of it, as rows.ts lists them (the kit's shapes, over Lampas's ids). */
interface Titled<Id extends string> {
  id: Id;
  title: string;
  hint?: string;
}
interface Page {
  id: GroupId;
  title: string;
  hint: string;
  sections: readonly SectionId[];
}

/**
 * The sections and the pages of the Settings screen, the listed ones and those the settings bring (mw-6ww.175.107): a setting that names a `page` for a section no page holds yet (with its `sectionTitle`)
 * makes the section, after the listed ones, and puts it last on that page. A setting that names a `page` for a section a page already holds must name that one, and a setting in a section no page holds
 * that names none is a mistake (but for one kept outside the registry, which has no row): both throw, naming the setting. The home's own sections are in no page.
 */
export function layoutOf(
  sections: readonly Titled<SectionId>[],
  pages: readonly Page[],
  modules: Modules,
  homeSections: readonly SectionId[] = [],
  keepOut: readonly SectionId[] = [],
): { sections: Titled<SectionId>[]; pages: Page[] } {
  const outSections = [...sections];
  const outPages = pages.map((p) => ({ ...p, sections: [...p.sections] }));
  const seen = new Set<unknown>();
  for (const value of exportsOf(modules)) {
    if (!isDefinition(value) || seen.has(value)) continue;
    seen.add(value);
    // a setting kept outside the registry has a section only when it has a row, and then it names its page like any other (the split's, in the section 'tools', has none)
    if (value.outside !== undefined && value.page === undefined && !pages.some((p) => p.sections.includes(value.section))) continue;
    const section = value.section;
    const holder = outPages.find((p) => p.sections.includes(section));
    const known = holder !== undefined || homeSections.includes(section) || keepOut.includes(section) || outSections.some((s) => s.id === section);
    if (value.page !== undefined && !outPages.some((p) => p.id === value.page)) throw new Error(`the setting '${value.key}' names the page '${value.page}', which is not a page of Settings`);
    if (holder) {
      if (value.page !== undefined && value.page !== holder.id)
        throw new Error(`the setting '${value.key}' names the page '${value.page}', but its section '${section}' is on the page '${holder.id}'`);
      continue;
    }
    if (known) continue;
    const page = outPages.find((p) => p.id === value.page);
    if (!page) throw new Error(`the setting '${value.key}' is in the section '${section}', which no page of Settings holds: name its page (and its sectionTitle)`);
    if (value.sectionTitle === undefined) throw new Error(`the setting '${value.key}' brings the new section '${section}' to the page '${page.id}': give its sectionTitle`);
    outSections.push({ id: section, title: value.sectionTitle, ...(value.sectionHint === undefined ? {} : { hint: value.sectionHint }) });
    page.sections.push(section);
  }
  return { sections: outSections, pages: outPages };
}
