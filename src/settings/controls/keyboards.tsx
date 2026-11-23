// Settings > Learning > Keyboards (mw-5r3p30.1191, moved from Daily): Greek keyboard and Hebrew keyboard, each On | Off, beside Handwriting.
import { greekKeyboardSetting } from '../definitions/greekKeyboard';
import { hebrewKeyboardSetting } from '../definitions/hebrewKeyboard';
import { useSetting } from '../store';
import { OnOff, RowName, SettingRow } from './SettingRow';
import { draws, type Control } from './types';

function keyboardSwitch(def: typeof greekKeyboardSetting | typeof hebrewKeyboardSetting, settingKey: 'greekKeyboard' | 'hebrewKeyboard'): Control {
  return function KeyboardSwitch({ row }) {
    const current = useSetting(def);
    return (
      <SettingRow row={row}>
        <RowName row={row} />
        {current ? <OnOff name={row.label} current={current} settingKey={settingKey} /> : null}
      </SettingRow>
    );
  };
}

export const GreekKeyboardControl = keyboardSwitch(greekKeyboardSetting, 'greekKeyboard');
export const HebrewKeyboardControl = keyboardSwitch(hebrewKeyboardSetting, 'hebrewKeyboard');

/** The rows each control above draws (src/settings/controls/index.ts gathers them by glob): a new control names its rows here and no list is edited. */
export const greekKeyboardControlDraws = draws(GreekKeyboardControl, 'greekKeyboard');
export const hebrewKeyboardControlDraws = draws(HebrewKeyboardControl, 'hebrewKeyboard');
