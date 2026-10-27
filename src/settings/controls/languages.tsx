// 'Which languages?' (first row of the Settings home, mw-gdcyf98.2): English only, Greek, Hebrew or Greek and Hebrew, four buttons. It is the two dials' own state
// (languagesOf), not a setting of its own: choosing one moves the dials (src/data/repositories/greekInterest.ts setLanguages), and each dial's row is drawn only while its language is chosen.
import { greekLevelOf } from '../definitions/greekInterest';
import { hebrewLevelOf } from '../definitions/hebrewInterest';
import { LANGUAGES_CHOICES, languagesOf } from '../definitions/interest';
import { greekInterestSetting, hebrewInterestSetting } from '../definitions';
import { writeSetting } from '../registry';
import { useSetting } from '../store';
import { SettingRow } from './SettingRow';
import type { Control } from './types';

export const LanguagesControl: Control = ({ row }) => {
  const greek = useSetting(greekInterestSetting);
  const hebrew = useSetting(hebrewInterestSetting);
  const current = greek === undefined || hebrew === undefined ? undefined : languagesOf(greekLevelOf(greek), hebrewLevelOf(hebrew));
  return (
    <SettingRow row={row} className="pb-4">
      <h2 className="pb-2 text-lg font-semibold">{row.label}</h2>
      <div role="group" aria-label={row.label} className="grid grid-cols-2 gap-2">
        {LANGUAGES_CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            data-languages={choice.value}
            aria-pressed={current === choice.value}
            onClick={() => void writeSetting(row.key, choice.value)}
            className={`flex min-h-12 items-center rounded-xl border px-3 py-2 text-left text-base font-medium ${current === choice.value ? 'border-accent bg-accent text-accent-fg' : 'border-line text-fg'}`}
          >
            <span className="title-wrap min-w-0">{choice.label}</span>
          </button>
        ))}
      </div>
    </SettingRow>
  );
};
