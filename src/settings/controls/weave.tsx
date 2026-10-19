import { useLiveQuery } from 'dexie-react-hooks';
import { getWeave, getWeaveGrammar } from '../../data/repositories';
import { weaveOrderSetting } from '../definitions';
import { getSetting } from '../store';
import type { SettingsRow } from '../rows';
import { ChipRow, SettingRow } from './SettingRow';

type WeaveKey = 'weave' | 'weaveGrammar' | 'weaveOrder';

/** Each Weave row: the small label at its left, how its value is read, and its chips. */
const WEAVE_ROWS: Record<WeaveKey, { label: string; read: () => Promise<string>; options: [string, string][] }> = {
  weave: { label: 'Words', read: getWeave, options: [['off', 'Off'], ['solid', 'Solid'], ['solid+learning', '+ Learning']] },
  weaveGrammar: { label: 'Grammar', read: getWeaveGrammar, options: [['any', 'Any'], ['solid', 'Solid'], ['solid+frontier', '+ Frontier']] },
  weaveOrder: { label: 'Order', read: () => getSetting(weaveOrderSetting), options: [['english', 'English'], ['greek', 'Greek']] },
};

/** The Weave's rows: a small label at the left and its chips on one line. */
export function WeaveControl({ row }: { row: SettingsRow }) {
  const key = (row.key in WEAVE_ROWS ? row.key : 'weave') as WeaveKey;
  const { label, read, options } = WEAVE_ROWS[key];
  const current = useLiveQuery(read, [key]);
  return (
    <SettingRow row={row}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-sm font-medium text-muted">{label}</span>
        {current ? <ChipRow name={row.label} current={current} options={options} settingKey={key} /> : null}
      </div>
    </SettingRow>
  );
}
