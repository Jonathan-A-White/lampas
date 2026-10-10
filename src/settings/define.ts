// src/settings/define.ts — a setting declared once (docs/module-map.md R2): its key, default, the values it allows and how a saved value
// is read back, and where it sits on the Settings screen (section, name, hint, help, what it depends on). src/settings/store.ts reads and
// saves it and tells the bus; src/settings/registry.ts and src/settings/rows.ts make its entry and its row from it. A setting declared so
// is one file in src/settings/definitions/ and one line in its index.ts.

/** What a setting holds: a choice's value (text) or a speed (number). */
export type SettingValue = string | number;

export type Allowed =
  | { kind: 'choice'; values: readonly { value: string; label: string }[] }
  | { kind: 'number'; min: number; max: number; step: number }
  /** free text the entry checks itself: `valid` takes the text a person or the tutor wrote; `example` is one it takes */
  | { kind: 'text'; valid(value: string): boolean; example: string };

/** The sections of the Settings screen, in the order it draws them (src/settings/rows.ts SECTIONS has their titles). */
export type SectionId =
  | 'appearance'
  | 'layout'
  | 'headings'
  | 'immersive'
  | 'weave'
  | 'newWords'
  | 'goal'
  | 'approach'
  | 'readAloud'
  | 'readTutor'
  | 'hebrew'
  | 'voices'
  | 'speed'
  | 'pronunciation'
  | 'resources'
  | 'logos'
  | 'tips'
  | 'developer'
  | 'studyWay'
  | 'more';

/** A row that is a detail of another: shown only while `shown(value)` says so of the other's value (as text: 'off', '0', 'on'). */
export interface Dependency {
  /** the other row's key: a setting's, or 'resource.<id>' for a study resource's switch */
  key: string;
  shown(value: string): boolean;
}

export interface SettingDef<T extends SettingValue> {
  /** the key it is saved under in the settings store, and what the grind and `settings_changes` call it: 'theme' */
  key: string;
  /** what it holds while he has not chosen, or when the saved value is not one it allows */
  default: T;
  /** the saved value, or the default when it is not one of the allowed values */
  parse(raw: unknown): T;
  allowed: Allowed;
  section: SectionId;
  /** what the Settings screen calls it (the name of its control): 'Theme' */
  label: string;
  /** one line (at most 90 characters) under the control, searched with the name: what it does */
  hint: string;
  /** the longer explanation, for the tutor and the row's 'More help' */
  help?: string;
  dependsOn?: Dependency;
}

/** A definition as it is written: a choice may leave out `parse` (the saved value when it is one of the choices, else the default). */
export type SettingSpec<T extends SettingValue> = Omit<SettingDef<T>, 'parse'> & { parse?: SettingDef<T>['parse'] };

export function defineSetting<T extends SettingValue>(spec: SettingSpec<T>): SettingDef<T> {
  if (spec.parse) return { ...spec, parse: spec.parse };
  const { allowed } = spec;
  if (allowed.kind !== 'choice') throw new Error(`setting ${spec.key} needs its own parse`);
  return { ...spec, parse: (raw) => (allowed.values.some((v) => v.value === raw) ? (raw as T) : spec.default) };
}
