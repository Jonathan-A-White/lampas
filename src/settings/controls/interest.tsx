// A language's dial (Settings home, mw-3ased2.2, mw-gdcyf98.2): "How much Greek?" or "How much Hebrew?", six named steps, 0 Just English to 5 All in. Each is a button with its
// name (never a bare number), and the line under the buttons says what the chosen step means. Choosing one writes the setting, which moves the dial
// (src/data/repositories/greekInterest.ts). Step 0 is never drawn: 'Which languages?' above is how a language is left off, and the dial's row hides with it.
import { levelsOf, type InterestLang } from '../definitions/interest';
import { greekInterestSetting, hebrewInterestSetting } from '../definitions';
import { writeSetting } from '../registry';
import { useSetting } from '../store';
import { SettingRow } from './SettingRow';
import type { Control } from './types';

function InterestControl({ language, ...props }: Parameters<Control>[0] & { language: InterestLang }) {
  const { row } = props;
  const steps = levelsOf(language);
  const value = useSetting(language === 'grc' ? greekInterestSetting : hebrewInterestSetting);
  const current = value === undefined ? undefined : steps.find((l) => String(l.level) === value);
  return (
    <SettingRow row={row} className="pb-4">
      <h2 className="pb-2 text-lg font-semibold">{row.label}</h2>
      <div role="group" aria-label={row.label} className="grid grid-cols-2 gap-2">
        {steps
          .filter((step) => step.level > 0)
          .map((step) => (
            <button
              key={step.level}
              type="button"
              data-step={step.level}
              aria-pressed={current?.level === step.level}
              onClick={() => void writeSetting(row.key, String(step.level))}
              className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-base font-medium ${current?.level === step.level ? 'border-accent bg-accent text-accent-fg' : 'border-line text-fg'}`}
            >
              <span aria-hidden="true" className="shrink-0 opacity-70">
                {step.level}
              </span>
              <span className="title-wrap min-w-0">{step.name}</span>
            </button>
          ))}
      </div>
      {current ? (
        <p data-testid={`${language === 'grc' ? 'greek' : 'hebrew'}-line`} aria-live="polite" className="pt-2 text-base">
          <span className="font-semibold">{current.name}.</span> {current.line}
        </p>
      ) : null}
    </SettingRow>
  );
}

export const GreekInterestControl: Control = (props) => <InterestControl language="grc" {...props} />;
export const HebrewInterestControl: Control = (props) => <InterestControl language="hbo" {...props} />;
