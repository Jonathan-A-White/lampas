import { useLiveQuery } from 'dexie-react-hooks';
import { getReadTutor, getScriptDepth, getTips } from '../../data/repositories';
import { ScriptText } from '../../script/ScriptText';
import { DEPTHS, SCRIPTS, type Depth, type TutorScript } from '../../script/scripts';
import { writeSetting } from '../registry';
import { ON_COLOUR, OnOff, SettingRow } from './SettingRow';
import type { Control } from './types';

function ScriptDepthChoice({ script, depth }: { script: TutorScript; depth: Depth }) {
  return (
    <div role="group" aria-label={script.settingLabel} className="flex flex-col gap-1 rounded-xl border border-line p-0.5">
      {DEPTHS.map((d) => (
        <button
          key={d.id}
          type="button"
          aria-pressed={depth === d.id}
          onClick={() => void writeSetting(script.settingKey, d.id)}
          className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-4 text-left text-base font-medium ${depth === d.id ? ON_COLOUR : 'text-fg'}`}
        >
          <span>{d.label}</span>
          <span className="text-base font-normal opacity-80" aria-hidden="true">
            <ScriptText text={script.examples[d.id]} />
          </span>
        </button>
      ))}
    </div>
  );
}

export const TipsControl: Control = ({ row }) => {
  const tips = useLiveQuery(getTips, []);
  return <SettingRow row={row}>{tips ? <OnOff name={row.label} current={tips} settingKey="tips" /> : null}</SettingRow>;
};

export const ReadTutorControl: Control = ({ row }) => {
  const readTutor = useLiveQuery(getReadTutor, []);
  return <SettingRow row={row}>{readTutor ? <OnOff name={row.label} current={readTutor} settingKey="readTutor" /> : null}</SettingRow>;
};

export const ScriptDepthControl: Control = ({ row }) => {
  const script = SCRIPTS.find((s) => s.settingKey === row.key);
  const depth = useLiveQuery(() => (script ? getScriptDepth(script) : Promise.resolve(undefined)), [script]);
  return <SettingRow row={row}>{script && depth ? <ScriptDepthChoice script={script} depth={depth} /> : null}</SettingRow>;
};
