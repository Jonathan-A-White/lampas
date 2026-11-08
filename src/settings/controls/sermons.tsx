// src/settings/controls/sermons.tsx — the switch of a sermon source (Settings > Study resources > Sermons, mw-qtu3zvz.3): the plain On/Off of 'sermons.<id>', read through the registry
// (src/settings/definitions/sermons.ts declares it) and saved through the settings store. The rows are made from the registry of sources (src/sermons/sources/index.ts SOURCES).
import { useLiveQuery } from 'dexie-react-hooks';
import { openWebSetting, type OpenWebIn } from '../definitions/sermons';
import { settingOf } from '../registry';
import { setSetting, useSetting } from '../store';
import { Chips } from '../../ui/Chips';
import { OnOff, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

export const SermonsControl: Control = ({ row }) => {
  const current = useLiveQuery(async () => String(await settingOf(row.key)?.read()), [row.key]);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {current === 'on' || current === 'off' ? <OnOff name={row.label} current={current} settingKey={row.key as `sermons.${string}`} /> : null}
    </SettingRow>
  );
};

/** 'Open web sermons in' (mw-qtu3zvz.16): This browser or Firefox, two chips; Firefox does something on Android only (src/sermons/openWeb.ts). */
export const OpenWebControl: Control = ({ row }) => {
  const current = useSetting(openWebSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {current ? (
        <Chips
          name={row.label}
          current={current}
          options={[
            ['browser', 'This browser'],
            ['firefox', 'Firefox'],
          ]}
          onChoose={(value) => void setSetting(openWebSetting, value as OpenWebIn)}
        />
      ) : null}
    </SettingRow>
  );
};
