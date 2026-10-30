// The Tutor door and Hand rows of Settings (mw-5r3p30.879): chips for each, kept through src/settings/definitions/tutorDoor.ts and src/settings/hand.ts. Choosing Floating ? before he has said
// which hand he holds his phone in asks it once, under the row; the answer is the Hand setting and the question is not asked again. Not registry settings: the tutor does not change them.
import { tutorDoorSetting, setTutorDoor, useTutorDoor, type TutorDoor } from '../definitions/tutorDoor';
import { handSetting, setHand, useHand, useHandAsked, type Hand } from '../hand';
import { Chips } from '../../ui/Chips';
import { RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

const doorOptions = tutorDoorSetting.allowed.kind === 'choice' ? tutorDoorSetting.allowed.values.map((v) => [v.value, v.label] as const) : [];
const handOptions = handSetting.allowed.kind === 'choice' ? handSetting.allowed.values.map((v) => [v.value, v.label] as const) : [];

export const HAND_QUESTION = 'Which hand do you hold your phone in?';

export const TutorDoorControl: Control = ({ row }) => {
  const door = useTutorDoor();
  const asked = useHandAsked();
  const hand = useHand();
  return (
    <SettingRow
      row={row}
      details={
        door === 'floating' && asked === false && hand ? (
          <div className="pt-3">
            <h4 className="pb-1 text-base font-medium">{HAND_QUESTION}</h4>
            <Chips name={HAND_QUESTION} current="" options={handOptions} onChoose={(value) => void setHand(value as Hand)} />
          </div>
        ) : null
      }
    >
      <RowName row={row} />
      {door ? <Chips name={row.label} current={door} options={doorOptions} onChoose={(value) => void setTutorDoor(value as TutorDoor)} /> : null}
    </SettingRow>
  );
};

export const HandControl: Control = ({ row }) => {
  const hand = useHand();
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {hand ? <Chips name={row.label} current={hand} options={handOptions} onChoose={(value) => void setHand(value as Hand)} /> : null}
    </SettingRow>
  );
};
