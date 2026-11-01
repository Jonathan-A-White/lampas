// The Hand row of Settings (mw-5r3p30.879): chips for the hand he holds his phone in, kept through src/settings/hand.ts. The floating ? (src/AskTutor.tsx) sits on that side. Not a registry setting: the tutor does not change it.
import { handSetting, setHand, useHand, type Hand } from '../hand';
import { Chips } from '../../ui/Chips';
import { RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

const handOptions = handSetting.allowed.kind === 'choice' ? handSetting.allowed.values.map((v) => [v.value, v.label] as const) : [];

export const HandControl: Control = ({ row }) => {
  const hand = useHand();
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {hand ? <Chips name={row.label} current={hand} options={handOptions} onChoose={(value) => void setHand(value as Hand)} /> : null}
    </SettingRow>
  );
};
