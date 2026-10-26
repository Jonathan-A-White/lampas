// tests/support/fake-layout.ts — jsdom has no layout, so a Range has no rectangles and a tap has no word under it. This gives every character of a tap target a box of 10 x 20 px, laid out
// left to right from the start of the target's text (clickWordOf puts that on; unstubRangeRects takes it off), and clicks at the middle of a word (mw-5r3p30.782). The src/reader/tappedWord.ts hit test then finds the word under the finger as it does on a phone.
import { fireEvent } from '@testing-library/react';

const CHAR_PX = 10;
const LINE_PX = 20;

/** The text of `el` before `node`, in characters. */
function charsBefore(el: Element, node: Node): number {
  let n = 0;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let t = walk.nextNode(); t && t !== node; t = walk.nextNode()) n += t.textContent?.length ?? 0;
  return n;
}

const own = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');

/** Takes the stub off again: a Range has no rectangles, so a tap knows no word (a test opens its screen with this, then clickWordOf puts the stub on). */
export function unstubRangeRects(): void {
  if (own) Object.defineProperty(Range.prototype, 'getClientRects', own);
  else delete (Range.prototype as { getClientRects?: unknown }).getClientRects;
}

/** Gives a Range the rectangles of its characters, as above. */
function stubRangeRects(): void {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value(this: Range): DOMRect[] {
      const target = (this.startContainer.parentElement ?? document.body).closest('[role="button"]') ?? document.body;
      const left = (charsBefore(target, this.startContainer) + this.startOffset) * CHAR_PX;
      const width = (this.toString().length || 0) * CHAR_PX;
      return [{ left, right: left + width, top: 0, bottom: LINE_PX, width, height: LINE_PX, x: left, y: 0, toJSON: () => ({}) }];
    },
  });
}

/** A click on the middle of `word` inside the tap target `el`, at the place the stubbed layout draws it. */
export function clickWordOf(el: HTMLElement, word: string): void {
  stubRangeRects();
  const at = (el.textContent ?? '').indexOf(word);
  if (at < 0) throw new Error(`no word "${word}" in "${el.textContent}"`);
  fireEvent.click(el, { clientX: (at + word.length / 2) * CHAR_PX, clientY: LINE_PX / 2 });
}
