// src/settings/definitions/index.ts — every setting declared once (src/settings/define.ts), one line each. src/settings/registry.ts makes
// their entries from these (and src/settings/rows.ts their rows); the rest of the settings are still written out in the registry until
// they move here (docs/module-map.md R2b to R2d).
import type { SettingDef, SettingValue } from '../define';
import { immersiveSetting } from './immersive';
import { themeSetting } from './theme';
import { tipsSetting } from './tips';
import { weaveSetting } from './weave';

export { immersiveSetting, themeSetting, tipsSetting, weaveSetting };

export const DEFINITIONS: readonly SettingDef<SettingValue>[] = [themeSetting, weaveSetting, tipsSetting, immersiveSetting];
