// src/tutor/doorRoom.ts — the room a screen's foot leaves for the floating ? (mw-5r3p30.961). The ? is fixed at the Hand side's edge, z-50, over everything (src/AskTutor.tsx FloatingTutor), so a row of
// foot buttons that runs the full width can be under it (the Hard sounds lesson's Next, found on 0.7.71). A foot row adds this class: padding on the ?'s side as wide as the ? (size-14) and its
// 0.75 rem margin from the edge, plus a little air, so its buttons end where the ? begins. Right until the Hand is read, as the Hand is. tests/e2e/door-overlap.spec.ts holds the proof. The answers of a question card
// take it too (mw-5r3p30.981: GrammarCard, WordQuestion, DrillScreen, the IPA card, SelfGrade, NextBar): the ? floats over the scroll box at one height and any row of buttons passes it as the box scrolls.
// So do the wrappers of buttons of every width (mw-5r3p30.998): the Reading check's parts, the Reading drill's scroll box (NextBar's 'sheet' bar stands in it and adds none) and Memorize's rows. The Verse view's tools line and its action block take it too (mw-5r3p30.1002), except the Reading check's, whose parts take it one by one (padded as a block too, its Next word card was a line too tall to sit above the bar at 360x740, mw-5r3p30.1037).
// Reading text takes none (mw-5r3p30.1005, the Governor's word: 'Always use full like before'): a column kept clear for the ? beside the Reader's and the Verse view's text (mw-5r3p30.992) cost a fifth of the line, and a word under the ? is
// his choice, a two-finger tap hides the ? and brings it back.
import { useHand } from '../settings/hand';

/** The padding class that keeps a foot row out from under the ?: the Hand's side, 4.5 rem. */
export function useDoorRoom(): string {
  return useHand() === 'left' ? 'pl-[4.5rem]' : 'pr-[4.5rem]';
}

