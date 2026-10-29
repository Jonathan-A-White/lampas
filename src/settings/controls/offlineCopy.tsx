// The Keep on this phone row (Settings > Reading, mw-lcv9z3g.2): the offline copy's scope and how it stands, drawn by src/settings/OfflineCopyRow.tsx. Not a registry setting.
import { OfflineCopyRow } from '../OfflineCopyRow';
import { RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

export const OfflineCopyControl: Control = ({ row }) => (
  <SettingRow row={row}>
    <RowName row={row} />
    <OfflineCopyRow name={row.label} />
  </SettingRow>
);
