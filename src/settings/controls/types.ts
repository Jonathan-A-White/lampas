import type { ReactNode } from 'react';
import type { SettingsRow } from '../rows';

/** A control of the registry's rows: it reads its own setting and draws it inside its SettingRow. */
export type Control = (props: { row: SettingsRow }) => ReactNode;

/**
 * A control and the rows it draws (mw-6ww.175.106): `keys` are row keys, `prefixes` are the start of a family of row keys (the study resources, the maps, the links) a row of ROWS may have.
 * A control file exports one of these for each control (made by `draws`); src/settings/controls/index.ts gathers them by glob (src/settings/gather.ts controlsOf), so a new control is one file edit and no list.
 */
export type ControlGroup = { readonly drawsRows: true; readonly control: Control; readonly keys: readonly string[]; readonly prefixes: readonly string[] };

/** The rows `control` draws: their keys, then, in an object, the prefixes of row keys it draws (`draws(Control, 'a', 'b')`, `draws(Control, { prefixes: ['maps.'] })`). */
export function draws(control: Control, ...rows: readonly (string | { readonly keys?: readonly string[]; readonly prefixes?: readonly string[] })[]): ControlGroup {
  const keys: string[] = [];
  const prefixes: string[] = [];
  for (const row of rows) {
    if (typeof row === 'string') keys.push(row);
    else {
      keys.push(...(row.keys ?? []));
      prefixes.push(...(row.prefixes ?? []));
    }
  }
  return { drawsRows: true, control, keys, prefixes };
}
