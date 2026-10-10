import { useLiveQuery } from 'dexie-react-hooks';
import { getGrammarMove, getNewWordsADay, getPickerGrammar } from '../../data/repositories';
import { paceNote } from '../../data/pace';
import { usePace } from '../../usePace';
import type { SettingsRow } from '../rows';
import { ChipRow, SettingRow } from './SettingRow';

const NEW_WORDS = {
  newWordsADay: { read: getNewWordsADay, options: [['0', 'Off'], ['3', '3'], ['5', '5'], ['10', '10']] },
  pickerGrammar: { read: getPickerGrammar, options: [['solid', 'Solid grammar'], ['frontier', 'Frontier grammar']] },
  grammarMove: { read: getGrammarMove, options: [['ask', 'Ask'], ['auto', 'Auto'], ['off', 'Off']] },
} satisfies Record<string, { read: () => Promise<string | number>; options: [string, string][] }>;

/** What the pace did to New words a day, under its chips. */
function PaceNote() {
  const pace = usePace();
  const note = pace ? paceNote(pace.reason) : null;
  return note ? (
    <p data-testid="pace-note" className="pt-1 text-base font-medium">
      {note}
    </p>
  ) : null;
}

/** New words a day, New words at and Move it: the setting's label above, its chips on one line. */
export function NewWordsControl({ row }: { row: SettingsRow }) {
  const key = row.key as keyof typeof NEW_WORDS;
  const { read, options } = NEW_WORDS[key];
  const current = useLiveQuery(async () => String(await read()), [key]);
  return (
    <SettingRow row={row}>
      <h3 className="pb-1 text-base font-medium">{row.label}</h3>
      {current !== undefined ? <ChipRow name={row.label} current={current} options={options} settingKey={key} /> : null}
      {key === 'newWordsADay' ? <PaceNote /> : null}
    </SettingRow>
  );
}
