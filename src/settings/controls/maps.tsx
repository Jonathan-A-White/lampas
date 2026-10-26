// src/settings/controls/maps.tsx — the switch of a map source (Settings > Study resources > Maps, mw-zbjgn3r.6): the plain On/Off of 'maps.<id>', read through the registry
// (src/settings/definitions/maps.ts declares it) and saved through the settings store. The rows are made from the registry of sources (src/maps/index.ts SOURCES).
import { useLiveQuery } from 'dexie-react-hooks';
import { settingOf } from '../registry';
import { OnOff, SettingRow } from './SettingRow';
import type { Control } from './types';

export const MapsControl: Control = ({ row }) => {
  const current = useLiveQuery(async () => String(await settingOf(row.key)?.read()), [row.key]);
  return <SettingRow row={row}>{current === 'on' || current === 'off' ? <OnOff name={row.label} current={current} settingKey={row.key as `maps.${string}`} /> : null}</SettingRow>;
};
