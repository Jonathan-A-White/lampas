// src/settings/entry.ts — what makes a registry entry (src/settings/registry.ts SETTINGS): the entry of a setting declared once (fromDefinition), the entry of a choice written by hand
// (choice) and the slot an entry group sits at (slotted). src/settings/definitions/ and src/settings/entries/ build their entries from here, and registry.ts gathers them (mw-6ww.175.105).
import { entryOf, type RowMeta as KitRowMeta, type SettingEntry as KitSettingEntry } from 'pwa-kit/settings';
import type { Theme } from '../appearance/themes';
import { publish, type AppEvent } from '../events/bus';
import type { SectionId, SettingDef, SettingValue } from './define';
import type { Immersive } from './definitions/immersive';
import type { Tips } from './definitions/tips';
import type { Weave } from './definitions/weave';
import { setSetting, settingsStore } from './store';

/** What the Settings screen needs of a row besides its control. */
export type RowMeta = KitRowMeta<SectionId> & {
  /** the row sets how the tutor works (the AI): with no licence it is drawn off and greyed, with 'Needs a licence' (mw-8m9dyu.3) */
  ai?: boolean;
};

/** An entry of the registry (the kit's, over Lampas's sections): `key` is what the grind and `settings_changes` call it, 'greekRate'; `hint` is one line (at most 90 characters) under the control. */
export type SettingEntry = KitSettingEntry<SectionId> & { ai?: boolean };

/** The voice value that means the phone's own pick; a voice he chose in Settings is its voiceURI, which a talk cannot name. */
export const PHONE_VOICE = 'default';

/** Some entries made by hand, and where they sit in SETTINGS (the order the tutor is told the settings in): a file of src/settings/entries/ exports one for each place it holds. */
export interface EntryGroup {
  slot: number;
  entries: readonly SettingEntry[];
}

/** An entry, or several that sit together, at `slot` (a setting's own `slot` is the same number: src/settings/define.ts). */
export const slotted = (slot: number, entries: SettingEntry | readonly SettingEntry[]): EntryGroup => ({ slot, entries: Array.isArray(entries) ? entries : [entries as SettingEntry] });

export function choice(
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

// The per-setting kinds the declared settings published before setting-changed, still published after it while feature steps read them
// (docs/module-map.md R2a); nothing in the app listens to them any more.
const OLD_KINDS: Readonly<Record<string, (value: SettingValue) => AppEvent>> = {
  theme: (value) => ({ kind: 'theme-changed', theme: value as Theme }),
  weave: (value) => ({ kind: 'weave-changed', weave: value as Weave }),
  tips: (value) => ({ kind: 'tips-changed', tips: value as Tips }),
  immersiveReader: (value) => ({ kind: 'immersive-changed', immersive: value as Immersive }),
};

/** The entry of a setting declared once (src/settings/definitions/): read and saved through src/settings/store.ts, which the kit's entryOf is given; a write also tells the old per-setting kind. */
export function fromDefinition<T extends SettingValue>(def: SettingDef<T>): SettingEntry {
  return {
    ...entryOf<SectionId>(def, settingsStore),
    ...(def.ai ? { ai: true } : {}),
    write: async (value) => {
      const parsed = def.parse(value);
      await setSetting(def, parsed);
      const old = OLD_KINDS[def.key];
      if (old) publish(old(parsed));
    },
  };
}
