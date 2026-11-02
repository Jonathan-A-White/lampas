// src/tutor/doorRoom.ts — the room a screen's foot leaves for the floating ? (mw-5r3p30.961). The ? is fixed at the Hand side's edge, z-50, over everything (src/AskTutor.tsx FloatingTutor), so a row of
// foot buttons that runs the full width can be under it (the Hard sounds lesson's Next, found on 0.7.71). A foot row adds this class: padding on the ?'s side as wide as the ? (size-14) and its
// 0.75 rem margin from the edge, plus a little air, so its buttons end where the ? begins. Right until the Hand is read, as the Hand is. tests/e2e/door-overlap.spec.ts holds the proof. The answers of a question card
// take it too (mw-5r3p30.981: GrammarCard, WordQuestion, DrillScreen, the IPA card, SelfGrade, NextBar): the ? floats over the scroll box at one height and any row of buttons passes it as the box scrolls.
import { useHand } from '../settings/hand';

/** The padding class that keeps a foot row out from under the ?: the Hand's side, 4.5 rem. */
export function useDoorRoom(): string {
  return useHand() === 'left' ? 'pl-[4.5rem]' : 'pr-[4.5rem]';
}
