// Settings > Handwriting (mw-86e9r1.51): Handwriting drills, Automatic | On | Off, and under it whether a pen has touched this phone, which is what
// Automatic goes by.
import { handwritingSetting } from '../definitions';
import { useSetting } from '../store';
import { usePenSeen } from '../../handwriting/useHandwriting';
import { ChipRow, SettingRow } from './SettingRow';
import type { Control } from './types';

export const HandwritingControl: Control = ({ row }) => {
  const value = useSetting(handwritingSetting);
  const pen = usePenSeen();
  return (
    <SettingRow
      row={row}
      details={
        pen === undefined ? null : (
          <p data-testid="pen-seen" className="pt-1 text-base">
            {pen ? 'A pen has touched this screen.' : 'No pen seen on this phone yet.'}
          </p>
        )
      }
    >
      {value ? (
        <ChipRow
          name={row.label}
          current={value}
          options={[
            ['auto', 'Automatic'],
            ['on', 'On'],
            ['off', 'Off'],
          ]}
          settingKey="handwritingDrills"
        />
      ) : null}
    </SettingRow>
  );
};
