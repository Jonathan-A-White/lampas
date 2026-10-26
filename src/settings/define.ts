// src/settings/define.ts — a setting declared once (docs/module-map.md R2): its key, default, the values it allows and how a saved value
// is read back, and where it sits on the Settings screen (section, name, hint, help, what it depends on). The declaration itself, its checks and
// its types are @pwa-kit/settings' (pwa-kit/settings); this file is Lampas's section ids and the one field the kit does not know, `store`.
// src/settings/store.ts reads and saves it and tells the bus; src/settings/registry.ts and src/settings/rows.ts make its entry and its row from it.
// A setting declared so is one file in src/settings/definitions/ and one line in its index.ts.
import { defineSetting as declareSetting, type SettingDef as KitSettingDef, type SettingSpec as KitSettingSpec, type SettingValue } from 'pwa-kit/settings';

export type { Allowed, Dependency, SettingValue } from 'pwa-kit/settings';

/** The sections of the Settings screen, in the order it draws them (src/settings/rows.ts SECTIONS has their titles). */
export type SectionId =
  | 'library'
  | 'dial'
  | 'appearance'
  | 'layout'
  | 'reading'
  | 'headings'
  | 'immersive'
  | 'weave'
  | 'newWords'
  | 'paradigms'
  | 'goal'
  | 'approach'
  | 'handwriting'
  | 'readAloud'
  | 'readTutor'
  | 'askBy'
  | 'talk'
  | 'hebrew'
  | 'voices'
  | 'speed'
  | 'pronunciation'
  | 'resources'
  | 'logos'
  | 'maps'
  | 'daily'
  | 'tips'
  | 'developer'
  | 'aboutYou'
  | 'memory'
  | 'studyWay'
  | 'more';

export interface SettingStore {
  /** where the value is kept when it is not a row of the settings store (the devotional draw is on his shelf, src/data/repositories/library.ts): read gives the text, write keeps it */
  store?: { read(): Promise<string>; write(value: string): Promise<void> };
}

export type SettingDef<T extends SettingValue> = KitSettingDef<T, SectionId> & SettingStore;

/** A definition as it is written: a choice may leave out `parse` (the saved value when it is one of the choices, else the default). */
export type SettingSpec<T extends SettingValue> = KitSettingSpec<T, SectionId> & SettingStore;

/** Declares a setting (the kit's defineSetting, over Lampas's sections): it throws at start-up for a declaration that cannot work. `store` is kept as written. */
export const defineSetting = <T extends SettingValue>(spec: SettingSpec<T>): SettingDef<T> => declareSetting<T, SectionId>(spec) as SettingDef<T>;
