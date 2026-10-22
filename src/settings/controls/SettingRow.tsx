import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Markdown } from '../../markdown/Markdown';
import { ReadAloud } from '../../speech/ReadAloud';
import { writeSetting } from '../registry';
import { Chips } from '../../ui/Chips';
import { helpPlain } from '../helpText';
import { HighlightedSetting } from './highlighted';
import type { SettingsRow } from '../rows';

export function Section({ id, title, hint, labelled, children }: { id?: string; title: string; hint?: string; labelled?: boolean; children: ReactNode }) {
  return (
    <section data-section={id} aria-label={labelled ? title : undefined} className="scroll-mt-20 border-b border-line py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint ? <p className="pb-2 text-base text-muted">{hint}</p> : null}
      {children}
    </section>
  );
}

/** The row's longer help, behind a quiet 'More help' that sits on the hint's line (its tap area reaches 44 px without costing height); open, it is a card of
 * the theme's surface with a line border and an accent bar at its left, the words (Markdown, src/markdown/Markdown.tsx: a list for steps and options) in the reading colour and the small Read aloud
 * speaker at its right, which says them without the marks (helpText.ts; mw-5r3p30.393, look mw-5r3p30.702, Markdown mw-5r3p30.721). Every Settings row that has a help gets it from here. */
export function MoreHelp({ text, id: rowKey }: { text: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="relative ml-2 text-base font-medium text-fg underline decoration-muted underline-offset-4 before:absolute before:-inset-x-2 before:-inset-y-3"
      >
        {open ? 'Less help' : 'More help'}
      </button>
      {open ? (
        <div id={id} data-help-panel className="mt-2 flex items-start gap-2 rounded-lg border border-l-4 border-line border-l-accent bg-surface p-3 text-base text-fg">
          <div data-help-text className="min-w-0 flex-1 self-center">
            <Markdown text={text} />
          </div>
          <ReadAloud id={`help:${rowKey ?? text}`} text={helpPlain(text)} />
        </div>
      ) : null}
    </>
  );
}

/** One row of Settings: its control, then the registry's one-line hint (and its help, on request), then any `details` of the control. */
export function SettingRow({ row, children, details, className = 'pb-3' }: { row: SettingsRow; children: ReactNode; details?: ReactNode; className?: string }) {
  const highlighted = useContext(HighlightedSetting) === row.key;
  const ref = useRef<HTMLDivElement>(null);
  // the row is drawn after its saved value is read, so it scrolls itself into view when it arrives marked
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' });
  }, [highlighted]);
  return (
    <div
      ref={ref}
      data-setting={row.key}
      data-highlighted={highlighted ? '' : undefined}
      className={highlighted ? `${className} -mx-2 rounded-lg bg-accent/15 px-2 pt-2 outline-2 outline-accent` : className}
    >
      {children}
      <div className="pt-1 text-base text-muted">
        {row.hint}
        {row.help ? <MoreHelp text={row.help} id={row.key} /> : null}
      </div>
      {details}
    </div>
  );
}

/** The row's name, written above its choices, for a row whose control names its group only with aria-label (mw-5r3p30.465). */
export function RowName({ row }: { row: SettingsRow }) {
  return <h3 className="pb-1 text-base font-medium">{row.label}</h3>;
}

/** The chips of a weave or New words row (src/ui/Chips.tsx), on one line while they fit (at the phone's largest text they wrap to the next), each tap written to the
 * setting; `name` is the setting's label in the registry. `size` 'header' is the smaller chip of a screen's header (the paradigm table's How much of a table). */
export function ChipRow({ name, current, options, settingKey, size }: { name: string; current: string; options: readonly (readonly [string, string])[]; settingKey: 'weave' | 'weaveGrammar' | 'weaveOrder' | 'pickerGrammar' | 'paradigmExtent' | 'grammarMove' | 'newWordsADay' | 'askBy' | 'talk' | 'send' | 'handwritingDrills' | 'readingMode' | 'chapterButtons'; size?: 'row' | 'header' }) {
  return <Chips name={name} current={current} options={options} onChoose={(value) => void writeSetting(settingKey, value)} size={size} />;
}

export const PICKER = 'mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg disabled:opacity-50';

export const ON_COLOUR = 'bg-accent text-accent-fg';

/** An On | Off choice of a talkable setting. */
export function OnOff({ name, current, settingKey }: { name: string; current: 'on' | 'off'; settingKey: 'sectionHeadings' | 'tips' | 'readTutor' | 'immersiveReader' | 'immersiveHint' | 'readLessons' | 'readingPlan' | 'dailyReview' | 'dailyPlan' | 'dailyPsalms' | 'dailyDevotional' | 'dailyTicks' }) {
  return (
    <div role="group" aria-label={name} className="inline-flex rounded-xl border border-line p-0.5">
      {(['on', 'off'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          onClick={() => void writeSetting(settingKey, value)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${current === value ? ON_COLOUR : 'text-fg'}`}
        >
          {value === 'on' ? 'On' : 'Off'}
        </button>
      ))}
    </div>
  );
}
