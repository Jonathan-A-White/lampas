// Reading (Settings > Reading, mw-5r3p30.299): how the Reader moves through a chapter. Scroll, the default, is one long text he scrolls; Turn pages lays
// the chapter out in pages the size of the reading box, turned by a tap on the right or left third of the text or a swipe (src/reader/usePages.ts).
import { defineSetting } from '../define';

export type ReadingMode = 'scroll' | 'pages';

export const readingModeSetting = defineSetting<ReadingMode>({
  key: 'readingMode',
  default: 'scroll',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'scroll', label: 'Scroll' },
      { value: 'pages', label: 'Turn pages' },
    ],
  },
  section: 'reading',
  label: 'Reading',
  hint: 'Scroll, or turn the pages like a book.',
  help: 'How the chapter is laid out:\n\n- **Scroll**: the default, one long text you scroll.\n- **Turn pages**: lays the chapter out in pages the size of the screen: tap the right third of the text or swipe left for the next page, the left third or swipe right for the one before; a tap in the middle opens a word, and a verse number or button does what it always does.',
});
