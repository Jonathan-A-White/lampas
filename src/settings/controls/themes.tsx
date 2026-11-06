// src/settings/controls/themes.tsx — the switch of a theme source (Settings > Study resources > Themes, mw-qtu3zvz.4): the plain On/Off of 'themes.<id>', read through the registry
// (src/settings/definitions/themes.ts declares it) and saved through the settings store. The rows are made from the registry of sources (src/themes/sources/index.ts SOURCES).
import { useLiveQuery } from 'dexie-react-hooks';
import { settingOf } from '../registry';
import { OnOff, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

export const ThemesControl: Control = ({ row }) => {
  const current = useLiveQuery(async () => String(await settingOf(row.key)?.read()), [row.key]);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {current === 'on' || current === 'off' ? <OnOff name={row.label} current={current} settingKey={row.key as `themes.${string}`} /> : null}
    </SettingRow>
  );
};
