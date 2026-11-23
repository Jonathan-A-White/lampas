// src/settings/registry.ts — every Settings item the app has, as a list: its key, its label, a one-line hint, longer help, the section
// it sits in, the setting it depends on, the values it allows, and how to read and write it. src/settings/rows.ts adds the rows that
// are not talkable (the study-resource switches, the links) and is the one list the Settings screen draws, searches and hides from. Writing saves the choice (src/data/repositories) and tells the bus, which is all the Settings screen does
// when he taps (it calls `write` here), so a change he asks for in the Bible talk takes the same path. The bible-talk grind is
// told this list (src/settings/grindText.ts builds its schema and instructions from it).
//
// The list is gathered, not written out (mw-6ww.175.105): a setting declared once is a file of src/settings/definitions/ and its entry is made from it (src/settings/gather.ts), at its `slot`;
// an entry made by hand is a file of src/settings/entries/. A new setting adds one file and edits neither this one nor an index. tests/unit/settings-registry.test.tsx fails if a control of
// the Settings screen has no entry.
import { createRegistry, MAX_CHANGES, type ChangeResult } from 'pwa-kit/settings';
import type { AppliedChange } from './applied';
import type { KnownSermonSource } from '../data/repositories/sermonSources';
import { serviceSource } from '../sermons/sources/service';
import type { Allowed, Dependency, SectionId, SettingValue } from './define';
import { DEFINITION_MODULES } from './definitions';
import { sermonSourceSetting } from './definitions/sermons';
import { ENTRY_MODULES } from './entries';
import { fromDefinition, PHONE_VOICE, type RowMeta, type SettingEntry } from './entry';
import { entriesOf } from './gather';

export type { Allowed, Dependency, RowMeta, SectionId, SettingEntry, SettingValue };

/** The longest text a talked change of a text setting may hold (the grind's schema says the same). */
export const TEXT_MAX = 80;

/** The voice value that means the phone's own pick; a voice he chose in Settings is its voiceURI, which a talk cannot name. */
export { PHONE_VOICE };

/** Every talkable Settings item, gathered (src/settings/gather.ts). (The screen draws them in src/settings/rows.ts's order, section by section.) */
export const SETTINGS: readonly SettingEntry[] = entriesOf(DEFINITION_MODULES, ENTRY_MODULES, fromDefinition);

/** The registry over SETTINGS (the kit's createRegistry): it looks a setting up, saves a change and checks a talked one against what each setting allows. */
const registry = createRegistry<SectionId>(SETTINGS, { textMax: TEXT_MAX });

/**
 * The On | Off rows of sermon sources the index service has and the bundle lacks (mw-qtu3zvz.5, docs/sermons.md 'When online'): made the first time a source is seen, from the list kept on the phone
 * (src/data/repositories/sermonSources.ts, src/sermons/known.ts), so they are not in SETTINGS: the tutor is not told of them and does not flip them by talk, and the grind's settings text does not name them.
 * Settings draws them (rows.ts growSermonRows) and they are read and saved here like any 'sermons.<id>'.
 */
const grown = new Map<string, SettingEntry>();

/** Makes the Settings entry of each known sermon source that has none; returns the ones it made. */
export function growSermonEntries(known: readonly KnownSermonSource[]): SettingEntry[] {
  const made: SettingEntry[] = [];
  for (const source of known) {
    const key = `sermons.${source.id}`;
    if (grown.has(key) || registry.settingOf(key)) continue;
    const entry = fromDefinition(sermonSourceSetting(serviceSource(source)));
    grown.set(key, entry);
    made.push(entry);
  }
  return made;
}

/** Whether `key` is the switch of a sermon source the service gave (not the bundled ones, not SETTINGS). */
export const isGrownSermon = (key: string): boolean => grown.has(key);

/** Forgets the grown entries (a test starts over). */
export const forgetGrownSermonEntries = (): void => grown.clear();

export const settingOf = (key: string): SettingEntry | undefined => registry.settingOf(key) ?? grown.get(key);

/** Saves a choice and tells the bus: what the Settings screen does when he taps a control. Throws for a key that is no setting. */
export const writeSetting = async (key: string, value: Parameters<typeof registry.write>[1]): Promise<void> => {
  const entry = grown.get(key);
  if (entry) return entry.write(value);
  return registry.write(key, value);
};

export type { AppliedChange, ChangeResult };
export { MAX_CHANGES };

/** Checks each change the grind asked for against the registry and applies the valid ones in order, one after the other (so a later change of the same setting is
 * from the earlier one). Anything else is ignored and said so in `refused`; `skipUnchanged` writes nothing, and says nothing, for a setting already set that way. */
export const applyChanges = registry.applyChanges;

/** A setting change the tutor offers instead of making (mw-5r3p30.186): `{key, value}` checked as applyChanges would check it, with the sentence the button and the
 * spoken read-back use ('Change Theme: Dark'); undefined for anything the registry would refuse. */
export const offeredChange = registry.offeredChange;

/** Puts back what `change` replaced, the same way it was written. */
export const undoChange = registry.undoChange;

/** What each setting holds now, as the grind may name it (a voice he chose is 'other'): sent with every talk, so 'slower' is from where it stands. */
export const currentSettings = registry.currentSettings;
