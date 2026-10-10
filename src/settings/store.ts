// src/settings/store.ts — reads and saves a setting declared once (src/settings/define.ts) in the settings store, and tells the bus. Saving
// is setSetting: the value is kept (as text, like every setting), then { kind: 'setting-changed', key, value } is published, once. The old
// getX/setX pairs of src/data/repositories/settings.ts are one-line wrappers over these for the settings declared so (docs/module-map.md R2).
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { latestSetting, publish, subscribe } from '../events/bus';
import type { SettingDef, SettingValue } from './define';

/** The saved value; the default when nothing is saved or the saved value is not one the setting allows. */
export async function getSetting<T extends SettingValue>(def: SettingDef<T>): Promise<T> {
  const row = await db.settings.get(def.key);
  return def.parse(row?.value);
}

/** Saves `value`, then publishes setting-changed. */
export async function setSetting<T extends SettingValue>(def: SettingDef<T>, value: T): Promise<void> {
  await db.settings.put({ key: def.key, value: String(value) });
  announceSetting(def, value);
}

/** The saved value, following every change (undefined until it has been read). */
export function useSetting<T extends SettingValue>(def: SettingDef<T>): T | undefined {
  return useLiveQuery(() => getSetting(def), [def]);
}

/** Tells the bus what the setting holds without saving it: for whoever loads a saved value at start and hands it on. */
export function announceSetting<T extends SettingValue>(def: SettingDef<T>, value: T): void {
  publish({ kind: 'setting-changed', key: def.key, value });
}

/** Calls `listener` with the value of each later setting-changed of this setting; returns the unsubscribe. */
export function onSetting<T extends SettingValue>(def: SettingDef<T>, listener: (value: T) => void): () => void {
  return subscribe('setting-changed', (event) => {
    if (event.key === def.key) listener(def.parse(event.value));
  });
}

/** The value the bus last told of this setting, or undefined when it has told none. */
export function toldSetting<T extends SettingValue>(def: SettingDef<T>): T | undefined {
  const event = latestSetting(def.key);
  return event ? def.parse(event.value) : undefined;
}
