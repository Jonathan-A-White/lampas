// Tutor door (Settings > The tutor > Asking the tutor, mw-5r3p30.879, part A of mw-5r3p30.843): how he reaches the tutor from a reading screen, never both: a two-finger tap
// (the default) or the floating round '?'. Declared like a setting but NOT in DEFINITIONS (index.ts): it is a row of its own (rows.ts TUTOR_DOOR_ROW, not talkable), so the
// Settings request the tutor is sent, src/tutor/knows.ts and the bible-talk instructions do not carry it. Read through getTutorDoor/useTutorDoor, saved by setTutorDoor.
import { defineSetting } from '../define';
import { getSetting, setSetting, useSetting } from '../store';

export type TutorDoor = 'twoFinger' | 'floating';

export const tutorDoorSetting = defineSetting<TutorDoor>({
  key: 'tutorDoor',
  default: 'twoFinger',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'twoFinger', label: 'Two-finger tap' },
      { value: 'floating', label: 'Floating ?' },
    ],
  },
  section: 'askBy',
  label: 'Tutor door',
  hint: 'How you reach the tutor from a reading screen: a two-finger tap, or a floating ? button.',
  help: 'One door to the tutor, never both:\n\n- **Two-finger tap**: touch the text with two fingers to open the tutor. Nothing is drawn over the reading.\n- **Floating ?**: a round ? button floats on the screen, on the side of the hand you hold your phone in (see Hand in Layout).\n\nTwo-finger tap by default. The first time you choose Floating ?, Lampas asks which hand you hold your phone in. Without a licence neither door shows.',
});

export const getTutorDoor = (): Promise<TutorDoor> => getSetting(tutorDoorSetting);

export const setTutorDoor = (door: TutorDoor): Promise<void> => setSetting(tutorDoorSetting, door);

/** The saved door, following every change; undefined until it has been read. */
export const useTutorDoor = (): TutorDoor | undefined => useSetting(tutorDoorSetting);
