import type { ReactNode } from 'react';
import type { SettingsRow } from '../rows';

/** A control of the registry's rows: it reads its own setting and draws it inside its SettingRow. */
export type Control = (props: { row: SettingsRow }) => ReactNode;
