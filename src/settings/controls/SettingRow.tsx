import { useId, useState, type ReactNode } from 'react';
import { writeSetting } from '../registry';
import type { SettingsRow } from '../rows';

export function Section({ title, hint, labelled, children }: { title: string; hint?: string; labelled?: boolean; children: ReactNode }) {
  return (
    <section aria-label={labelled ? title : undefined} className="border-b border-line py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint ? <p className="pb-2 text-base text-muted">{hint}</p> : null}
      {children}
    </section>
  );
}

/** The row's longer help, behind a small 'More help' that sits on the hint's line (its tap area reaches 44 px without costing height). */
export function MoreHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="relative ml-2 text-base font-medium text-accent underline before:absolute before:-inset-x-2 before:-inset-y-3"
      >
        {open ? 'Less help' : 'More help'}
      </button>
      {open ? (
        <span id={id} className="mt-1 block text-base text-muted">
          {text}
        </span>
      ) : null}
    </>
  );
}

/** One row of Settings: its control, then the registry's one-line hint (and its help, on request), then any `details` of the control. */
export function SettingRow({ row, children, details, className = 'pb-3' }: { row: SettingsRow; children: ReactNode; details?: ReactNode; className?: string }) {
  return (
    <div data-setting={row.key} className={className}>
      {children}
      <p className="pt-1 text-base text-muted">
        {row.hint}
        {row.help ? <MoreHelp text={row.help} /> : null}
      </p>
      {details}
    </div>
  );
}

/** The three chips of a weave or New words row, on one line (never wrapped); `name` is the setting's label in the registry. */
export function ChipRow({ name, current, options, settingKey }: { name: string; current: string; options: [string, string][]; settingKey: 'weave' | 'weaveGrammar' | 'pickerGrammar' | 'grammarMove' | 'newWordsADay' }) {
  return (
    <div role="group" aria-label={name} className="inline-flex max-w-full min-w-0 flex-nowrap rounded-xl border border-line p-0.5">
      {options.map(([value, text]) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          onClick={() => void writeSetting(settingKey, value)}
          className={`min-h-12 min-w-12 whitespace-nowrap rounded-lg px-3 text-base font-medium ${current === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export const PICKER = 'mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg disabled:opacity-50';

export const ON_COLOUR = 'bg-accent text-accent-fg';

/** An On | Off choice of a talkable setting. */
export function OnOff({ name, current, settingKey }: { name: string; current: 'on' | 'off'; settingKey: 'sectionHeadings' | 'tips' | 'readTutor' }) {
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
