// src/settings/definitions/index.ts — every setting declared once (src/settings/define.ts), gathered from the files of this directory by glob (src/settings/gather.ts): a new setting is one new file
// and edits no list here (mw-6ww.175.105). Its `order` places it in DEFINITIONS and its `slot` in the registry's SETTINGS (src/settings/registry.ts); a setting with neither comes last, by key.
// A setting that has a registry entry made by hand (src/settings/entries/) has no `slot`, and one kept out of both says why in `outside`. Import a setting from its own file.
import type { SettingDef, SettingValue } from '../define';
import { definitionsOf, type Modules } from '../gather';

/** The exports of every file of this directory (the glob itself, for src/settings/registry.ts, which makes the registry's entries from them). */
export const DEFINITION_MODULES: Modules = import.meta.glob(['./*.ts', '!./index.ts'], { eager: true });

export const DEFINITIONS: readonly SettingDef<SettingValue>[] = definitionsOf(DEFINITION_MODULES);
