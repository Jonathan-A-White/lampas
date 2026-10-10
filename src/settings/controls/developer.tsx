import { useLiveQuery } from 'dexie-react-hooks';
import { getDeveloper, setDeveloper } from '../../data/repositories';
import { ON_COLOUR, SettingRow } from './SettingRow';
import type { Control } from './types';

function DeveloperChoice({ name, developer }: { name: string; developer: 'on' | 'off' }) {
  return (
    <div role="group" aria-label={name} className="inline-flex rounded-xl border border-line p-0.5">
      {(['on', 'off'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={developer === value}
          onClick={() => void setDeveloper(value)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${developer === value ? ON_COLOUR : 'text-fg'}`}
        >
          {value === 'on' ? 'On' : 'Off'}
        </button>
      ))}
    </div>
  );
}

export const DeveloperControl: Control = ({ row }) => {
  const developer = useLiveQuery(getDeveloper, []);
  return <SettingRow row={row}>{developer === 'on' || developer === 'off' ? <DeveloperChoice name={row.label} developer={developer} /> : null}</SettingRow>;
};
