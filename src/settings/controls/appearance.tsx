import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { copyText, copyUnitOf, type CopyFormat, type ReadView } from '../../copy/format';
import { useCopyFormat } from '../../copy/useCopyFormat';
import { loadChapter, type Chapter } from '../../data/chapter';
import { TEXT_SIZES } from '../../appearance/textSizes';
import { FONTS, type FontId } from '../../appearance/fonts';
import { THEMES, type Theme } from '../../appearance/themes';
import { getLayout, getSectionHeadings, getTextSize, type ReadingLayout } from '../../data/repositories';
import { chapterButtonsSetting, copyLinkSetting, copyNumbersSetting, copyReferenceSetting, copyTextSetting, fontSetting, immersiveHintSetting, immersiveSetting, readingModeSetting, themeSetting } from '../definitions';
import { settingsFor, useViewSettings } from '../../reader/useViewSettings';
import { wovenOf } from '../../reader/useWoven';
import { useSetting } from '../store';
import { LAYOUTS } from '../../layout/layouts';
import { writeSetting } from '../registry';
import { ChipRow, OnOff, RowName, SettingRow } from './SettingRow';
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

/** The fonts, one per line: its name drawn in its own face, then the plain line of who it suits. */
function FontChoice({ font }: { font: FontId }) {
  return (
    <div role="group" aria-label="Font" className="flex flex-col gap-1 rounded-xl border border-line p-0.5">
      {FONTS.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={font === f.id}
          onClick={() => void writeSetting('font', f.id)}
          className={`min-h-12 rounded-lg px-4 py-2 text-left ${font === f.id ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          <span className="block text-base font-medium" style={f.stack ? { fontFamily: f.stack } : undefined}>{f.label}</span>
          <span className="block text-base">{f.line}</span>
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

export const FontControl: Control = ({ row }) => {
  const font = useSetting(fontSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {font ? <FontChoice font={font} /> : null}
    </SettingRow>
  );
};

export const LayoutControl: Control = ({ row }) => {
  const layout = useLiveQuery(getLayout, []);
  return <SettingRow row={row}>{layout ? <LayoutChoice layout={layout} /> : null}</SettingRow>;
};

export const ReadingModeControl: Control = ({ row }) => {
  const mode = useSetting(readingModeSetting);
  return (
    <SettingRow row={row}>
      {mode ? (
        <ChipRow
          name={row.label}
          current={mode}
          options={[
            ['scroll', 'Scroll'],
            ['pages', 'Turn pages'],
          ]}
          settingKey="readingMode"
        />
      ) : null}
    </SettingRow>
  );
};

export const ChapterButtonsControl: Control = ({ row }) => {
  const buttons = useSetting(chapterButtonsSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {buttons ? (
        <ChipRow
          name={row.label}
          current={buttons}
          options={[
            ['show', 'Show'],
            ['hide', 'Hide'],
          ]}
          settingKey="chapterButtons"
        />
      ) : null}
    </SettingRow>
  );
};

export const ImmersiveControl: Control = ({ row }) => {
  const immersive = useSetting(immersiveSetting);
  return <SettingRow row={row}>{immersive ? <OnOff name={row.label} current={immersive} settingKey="immersiveReader" /> : null}</SettingRow>;
};

export const ImmersiveHintControl: Control = ({ row }) => {
  const hint = useSetting(immersiveHintSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {hint ? <OnOff name={row.label} current={hint} settingKey="immersiveHint" /> : null}
    </SettingRow>
  );
};

export const HeadingsControl: Control = ({ row }) => {
  const headings = useLiveQuery(getSectionHeadings, []);
  return <SettingRow row={row}>{headings ? <OnOff name={row.label} current={headings} settingKey="sectionHeadings" /> : null}</SettingRow>;
};

const COPY_ROWS = {
  copyText: { setting: copyTextSetting, options: [['asread', 'As you read it'], ['english', 'English'], ['original', 'The original'], ['both', 'Both']] },
  copyReference: { setting: copyReferenceSetting, options: [['after', 'After'], ['before', 'Before'], ['off', 'Off']] },
  copyNumbers: { setting: copyNumbersSetting, options: [['on', 'On'], ['off', 'Off']] },
  copyLink: { setting: copyLinkSetting, options: [['on', 'On'], ['off', 'Off']] },
} as const;

/** One line under the last row of When you copy: Colossians 3:1 as it will be copied, in the view he reads in (the chapter is the app's own file, kept by the worker). */
function CopyPreview({ format }: { format: CopyFormat }) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const saved = useViewSettings();
  const read = useMemo((): ReadView | undefined => {
    if (!chapter || !saved) return undefined;
    const shown = settingsFor(saved, chapter);
    return { view: shown.view, woven: wovenOf(chapter, shown) };
  }, [chapter, saved]);
  useEffect(() => {
    let alive = true;
    loadChapter('col', 3).then(
      (c) => alive && setChapter(c),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
  const verse = chapter?.verses.find((v) => v.n === 1);
  if (!chapter || !verse || !read) return null;
  return (
    <p data-copy-preview className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-line bg-surface p-2 text-base text-muted">
      {copyText(copyUnitOf(chapter, verse, read), format)}
    </p>
  );
}

/** The four rows of When you copy: Text, Reference, Verse numbers and Link, each a chip row; the last has the preview under its hint. */
export const CopyFormatControl: Control = ({ row }) => {
  const { setting, options } = COPY_ROWS[row.key as keyof typeof COPY_ROWS];
  const current = useSetting(setting);
  const format = useCopyFormat();
  return (
    <SettingRow row={row} details={row.key === 'copyLink' && format ? <CopyPreview format={format} /> : undefined}>
      <RowName row={row} />
      {current ? <ChipRow name={row.label} current={current} options={options} settingKey={row.key as keyof typeof COPY_ROWS} /> : null}
    </SettingRow>
  );
};
