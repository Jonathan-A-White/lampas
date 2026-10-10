import { useLiveQuery } from 'dexie-react-hooks';
import { getWeave, getWeaveGrammar } from '../../data/repositories';
import type { SettingsRow } from '../rows';
import { ChipRow, SettingRow } from './SettingRow';

/** The Weave's rows: a small label at the left and three chips on one line. */
export function WeaveControl({ row }: { row: SettingsRow }) {
  const grammar = row.key === 'weaveGrammar';
  const current = useLiveQuery(grammar ? getWeaveGrammar : getWeave, [grammar]);
  const options: [string, string][] = grammar
    ? [['any', 'Any'], ['solid', 'Solid'], ['solid+frontier', '+ Frontier']]
    : [['off', 'Off'], ['solid', 'Solid'], ['solid+learning', '+ Learning']];
  return (
    <SettingRow row={row}>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-sm font-medium text-muted">{grammar ? 'Grammar' : 'Words'}</span>
        {current ? <ChipRow name={row.label} current={current} options={options} settingKey={grammar ? 'weaveGrammar' : 'weave'} /> : null}
      </div>
    </SettingRow>
  );
}
