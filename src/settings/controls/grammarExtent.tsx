// src/settings/controls/grammarExtent.tsx — the one control of a setting whose choices are grammar extents (mw-irpgqi.2, docs/paradigm-components.md): the chips
// of the Weave's Grammar row (weave.tsx), of New words at (newWords.tsx), of How much of a table (its Settings row, GrammarExtentControl, and the switch in a
// paradigm table's header). The options are the one table of src/settings/definitions/grammarExtent.ts; a tap is written through the registry like any chip.
// The live value is src/settings/useExtent.ts (a hook, so this file exports components alone).
import { EXTENT_SETTINGS, type ExtentKey } from '../definitions/grammarExtent';
import { useParadigmExtent } from '../useExtent';
import { ChipRow, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

/** The chips of an extent setting: its own values and words, in its order. Nothing is drawn until the saved value (`current`) is read. */
export function ExtentChips({ settingKey, name, current, size }: { settingKey: ExtentKey; name: string; current: string | undefined; size?: 'row' | 'header' }) {
  if (current === undefined) return null;
  const options = EXTENT_SETTINGS[settingKey].options.map(({ value, label }) => [value, label] as const);
  return <ChipRow name={name} current={current} options={options} settingKey={settingKey} size={size} />;
}

/** The Settings row of How much of a table: the name above, the three chips on one line. */
export const GrammarExtentControl: Control = ({ row }) => {
  const extent = useParadigmExtent();
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      <ExtentChips settingKey="paradigmExtent" name={row.label} current={extent} />
    </SettingRow>
  );
};
