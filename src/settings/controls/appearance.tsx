import { useLiveQuery } from 'dexie-react-hooks';
import { TEXT_SIZES } from '../../appearance/textSizes';
import { THEMES, type Theme } from '../../appearance/themes';
import { getLayout, getSectionHeadings, getTextSize, type ReadingLayout } from '../../data/repositories';
import { immersiveSetting, themeSetting } from '../definitions';
import { useSetting } from '../store';
import { LAYOUTS } from '../../layout/layouts';
import { writeSetting } from '../registry';
import { OnOff, SettingRow } from './SettingRow';
import type { Control } from './types';

function ThemeChoice({ theme }: { theme: Theme }) {
  return (
    <div role="group" aria-label="Theme" className="inline-flex flex-wrap rounded-xl border border-line p-0.5">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={theme === t.id}
          onClick={() => void writeSetting('theme', t.id)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${theme === t.id ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TextSizeChoice({ percent }: { percent: number }) {
  return (
    <div role="group" aria-label="Text size" className="inline-flex flex-wrap rounded-xl border border-line p-0.5">
      {TEXT_SIZES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={percent === t.percent}
          onClick={() => void writeSetting('textSize', t.id)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${percent === t.percent ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function LayoutChoice({ layout }: { layout: ReadingLayout }) {
  return (
    <div role="group" aria-label="Layout" className="inline-flex flex-wrap rounded-xl border border-line p-0.5">
      {LAYOUTS.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={layout === l.id}
          onClick={() => void writeSetting('layout', l.id)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${layout === l.id ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export const AppearanceControl: Control = ({ row }) => {
  const theme = useSetting(themeSetting);
  const textSize = useLiveQuery(getTextSize, []);
  const isTheme = row.key === 'theme';
  return (
    <SettingRow row={row}>
      <h3 className="pb-1 text-base font-medium">{row.label}</h3>
      {isTheme ? (theme ? <ThemeChoice theme={theme} /> : null) : textSize !== undefined ? <TextSizeChoice percent={textSize} /> : null}
    </SettingRow>
  );
};

export const LayoutControl: Control = ({ row }) => {
  const layout = useLiveQuery(getLayout, []);
  return <SettingRow row={row}>{layout ? <LayoutChoice layout={layout} /> : null}</SettingRow>;
};

export const ImmersiveControl: Control = ({ row }) => {
  const immersive = useSetting(immersiveSetting);
  return <SettingRow row={row}>{immersive ? <OnOff name={row.label} current={immersive} settingKey="immersiveReader" /> : null}</SettingRow>;
};

export const HeadingsControl: Control = ({ row }) => {
  const headings = useLiveQuery(getSectionHeadings, []);
  return <SettingRow row={row}>{headings ? <OnOff name={row.label} current={headings} settingKey="sectionHeadings" /> : null}</SettingRow>;
};
