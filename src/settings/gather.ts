// src/settings/gather.ts — the settings lists, gathered from the files of src/settings/definitions/ (and src/settings/entries/) by glob, so a new setting is one new file and edits no list
// (mw-6ww.175.105, slice 1 of the Lampas registry). A module's exports are looked at one by one: a setting declared with defineSetting (it has `key` and `parse`) is in DEFINITIONS and makes its registry entry (unless one is made by hand in src/settings/entries/); an EntryGroup (src/settings/entry.ts slotted) is an entry made by hand. Both lists are in order: the number `order` or `slot` says,
// lowest first, then by key; one with no number comes after all that have one.
import type { SettingDef, SettingValue } from './define';
import type { Control, ControlGroup } from './controls/types';
import type { EntryGroup, SettingEntry } from './entry';

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
  return sorted([...found.values()], (d) => d.order, (d) => d.key);
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
  return sorted(placed, (p) => p.slot, (p) => p.key).flatMap((p) => p.entries);
}

/** A control and the rows it draws, as src/settings/controls/types.ts `draws` makes it. */
export const isControlGroup = (value: unknown): value is ControlGroup => isRecord(value) && value.drawsRows === true && typeof value.control === 'function' && Array.isArray(value.keys) && Array.isArray(value.prefixes);

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
