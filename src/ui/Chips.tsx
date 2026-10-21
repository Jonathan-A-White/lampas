// src/ui/Chips.tsx — the segmented chips (mw-irpgqi.2, docs/paradigm-components.md): one row of choices in a rounded frame, the chosen one filled, each a
// thumb-sized button with aria-pressed. The look of every chip row in the app: a Settings row's (src/settings/controls/SettingRow.tsx ChipRow binds it to
// a setting) and a screen's own switch (the paradigm table's Learn | Drill). On one line while they fit; at the phone's largest text they wrap.

export interface ChipsProps {
  /** the group's accessible name: the setting's label, or what the switch chooses ('Mode') */
  name: string;
  current: string;
  options: readonly (readonly [value: string, label: string])[];
  onChoose: (value: string) => void;
  /** a chip's size: the Settings rows' 48 px and text-base, or a header's chrome-text at 44 px */
  size?: 'row' | 'header';
}

export function Chips({ name, current, options, onChoose, size = 'row' }: ChipsProps) {
  const chip = size === 'header' ? 'min-h-11 min-w-11 px-2 chrome-text' : 'min-h-12 min-w-12 px-3 text-base';
  return (
    <div role="group" aria-label={name} className="inline-flex max-w-full min-w-0 flex-wrap rounded-xl border border-line p-0.5">
      {options.map(([value, text]) => (
        <button key={value} type="button" aria-pressed={current === value} onClick={() => onChoose(value)} className={`${chip} rounded-lg font-medium ${current === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}>
          {text}
        </button>
      ))}
    </div>
  );
}
