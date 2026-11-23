// src/settings/entries/index.ts — the registry entries made by hand, gathered by glob (src/settings/gather.ts): a file of this directory exports an EntryGroup (src/settings/entry.ts slotted)
// for each place it holds in SETTINGS. A setting declared once needs no file here: its entry is made from its definition (src/settings/definitions/).
import type { Modules } from '../gather';

export const ENTRY_MODULES: Modules = import.meta.glob(['./*.ts', '!./index.ts'], { eager: true });
