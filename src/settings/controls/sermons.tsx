// src/settings/controls/sermons.tsx — the two rows of Settings > Study resources > Sermons (mw-qtu3zvz.92, docs/design/sermon-sources.md section 2): Sermon sources, a door in the shape of a row of the
// Library's home (its name, how many are on, a chevron) that opens the one list of every sermon source (src/sermons/SermonSourcesPage.tsx), and Open web sermons in. No source has a row here: a source's
// switch `sermons.<id>` (src/settings/definitions/sermons.ts) is drawn on that page.
import { openWebSetting, type OpenWebIn } from '../definitions/sermons';
import { openSermonSources } from '../link';
import { setSetting, useSetting } from '../store';
import { countLine, onCount } from '../../sermons/sourceList';
import { useSourceList } from '../../sermons/useSourceList';
import { Chips } from '../../ui/Chips';
import { RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

/** 'Sermon sources  17 of 120 on ›': the count is of the sources listed for him, live. */
export const SermonSourcesControl: Control = ({ row }) => {
  const list = useSourceList();
  return (
    <SettingRow row={row} className="border-b border-line pb-2">
      <button type="button" onClick={() => openSermonSources()} className="flex min-h-12 w-full items-center gap-3 text-left text-base">
        <span className="shrink-0 font-medium">{row.label}</span>{' '}
        <span data-testid="sources-count" className="min-w-0 flex-1 text-right text-muted">
          {list ? countLine(onCount(list.items), list.items.length) : ''}
        </span>{' '}
        <span aria-hidden="true" className="shrink-0 text-muted">
          ›
        </span>
      </button>
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
