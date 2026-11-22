// src/settings/controls/themes.tsx — the switch of a theme source (Settings > Study resources > Themes, mw-qtu3zvz.4): the plain On/Off of 'themes.<id>', read through the registry
// (src/settings/definitions/themes.ts declares it) and saved through the settings store. The rows are made from the registry of sources (src/themes/sources/index.ts SOURCES).
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useHiddenThemes } from '../../sermons/useThemes';
import { showTheme } from '../../themes';
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

/**
 * 'Hidden themes' (mw-qtu3zvz.91): the themes he hid from a verse's Themes line, each a name with 'Show again' (one tap, 44 px), and a line that says what the tap did ('Shown again: Atonement.'). None hidden says so.
 * A theme is hidden by 'Hide this theme' on its sermon list (src/sermons/SermonsSheet.tsx); the names are the setting 'themesHidden' (definitions/themes.ts).
 */
export const HiddenThemesControl: Control = ({ row }) => {
  const names = useHiddenThemes();
  const [said, setSaid] = useState<string | null>(null);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {names === undefined ? null : names.length === 0 ? (
        <p data-hidden-none className="text-base">
          No themes are hidden.
        </p>
      ) : (
        <ul data-hidden-themes className="flex flex-col gap-1">
          {names.map((name) => (
            <li key={name} className="flex min-h-11 items-center justify-between gap-3">
              <span className="min-w-0 break-words text-base">{name}</span>
              <button
                type="button"
                data-show-theme
                aria-label={`Show again: ${name}`}
                onClick={() => void showTheme(name).then(() => setSaid(`Shown again: ${name}.`))}
                className="min-h-11 shrink-0 rounded-xl border border-line px-3 text-base font-medium text-accent active:bg-line"
              >
                Show again
              </button>
            </li>
          ))}
        </ul>
      )}
      {said ? (
        <p data-hidden-said role="status" className="pt-1 text-sm text-muted">
          {said}
        </p>
      ) : null}
    </SettingRow>
  );
};
