// src/settings/controls/index.ts — the control of each row, gathered by glob from the files of this directory (src/settings/gather.ts controlsOf): a control file exports, for each control, the rows
// it draws (src/settings/controls/types.ts `draws`), so a new control is one file and edits no list here (mw-6ww.175.106, slice 2 of the Lampas registry). A row with no control is a test failure.
import { controlsOf, type Modules } from '../gather';
import { ROWS } from '../rows';
import type { Control } from './types';

/** The exports of every file of this directory (the glob itself, for a test that gathers a directory of its own the same way). */
export const CONTROL_MODULES: Modules = import.meta.glob(['./*.ts', './*.tsx', '!./index.ts'], { eager: true });

/** The control of each row, by the row's key (src/settings/rows.ts): a row with no control here is a test failure. */
export const CONTROLS: Readonly<Record<string, Control>> = controlsOf(CONTROL_MODULES, ROWS.map((r) => r.key));
