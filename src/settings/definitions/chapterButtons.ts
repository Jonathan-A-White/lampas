// Chapter buttons (Settings > Reading, mw-5r3p30.706): whether the ‹ and › buttons are drawn at a chapter's foot (src/ChapterNav.tsx). Show is the default;
// Hide is what the one-time offer sets once he has changed chapter by a swipe (src/tips/hints.ts), and this brings the buttons back.
import { defineSetting } from '../define';

export type ChapterButtons = 'show' | 'hide';

export const chapterButtonsSetting = defineSetting<ChapterButtons>({
  key: 'chapterButtons',
  default: 'show',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'show', label: 'Show' },
      { value: 'hide', label: 'Hide' },
    ],
  },
  section: 'reading',
  label: 'Chapter buttons',
  hint: 'The ‹ and › buttons at the end of each chapter. Swipe left or right to change chapter.',
  help: 'Whether the ‹ and › buttons are drawn after the last verse of a chapter, to the chapter before and the chapter after:\n\n- **Show**: the default.\n- **Hide**: no buttons; swipe the text left for the next chapter and right for the one before (with Turn pages, swipe past the last or first page).\n\nLampas offers to hide them once, after you have changed chapter by a swipe. Switch this back to Show to bring them back.',
});
