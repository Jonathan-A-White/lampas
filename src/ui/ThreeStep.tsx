// src/ui/ThreeStep.tsx — a state control of two or three steps in a row (Off | On | Pin), the segmented look of Chips (src/ui/Chips.tsx) as one choice of a group: role radiogroup,
// each step a radio at least 44 px high and wide, the chosen one filled. Chips are buttons that toggle (aria-pressed); this is a choice of exactly one, so a screen reader hears
// 'On, radio button, 2 of 3'. The Library's rows use it (docs/design/library-at-scale.md 3.4). A tap goes through oneTap so a double tap ends where one tap does.
import { oneTap } from './settle';

export interface ThreeStepProps {
  /** the group's accessible name: the book's name */
  name: string;
  current: string;
  options: readonly (readonly [value: string, label: string])[];
  onChoose: (value: string) => void;
}

export function ThreeStep({ name, current, options, onChoose }: ThreeStepProps) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex shrink-0 rounded-xl border border-line p-0.5">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={() => oneTap(`three-step:${name}`, () => onChoose(value))}
          className={`min-h-11 min-w-11 rounded-lg px-3 text-base font-medium ${current === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
