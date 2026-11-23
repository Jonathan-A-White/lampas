// The Keep on this phone row (Settings > Reading, mw-lcv9z3g.2): the offline copy's scope and how it stands, drawn by src/settings/OfflineCopyRow.tsx. Not a registry setting.
import { OfflineCopyRow } from '../OfflineCopyRow';
import { RowName, SettingRow } from './SettingRow';
import { draws, type Control } from './types';

export const OfflineCopyControl: Control = ({ row }) => (
  <SettingRow row={row}>
    <RowName row={row} />
    <OfflineCopyRow name={row.label} />
  </SettingRow>
);

/** The rows each control above draws (src/settings/controls/index.ts gathers them by glob): a new control names its rows here and no list is edited. */
export const offlineCopyControlDraws = draws(OfflineCopyControl, 'offlineCopy');
