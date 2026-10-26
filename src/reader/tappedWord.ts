// src/reader/tappedWord.ts — which word of an English chunk the finger was on (mw-5r3p30.782). A chunk ('of Nineveh') is one tap target, so the click says where, not which: this measures
// the chunk's own words with a Range and takes the one nearest the touch, with no change to how the chunk is drawn. Nothing where the browser gives no word boxes (the keyboard, a test without layout).

/** The word of `el`'s text nearest the point (x, y), as the text has it ('Amittai,'), or undefined when `el` holds one word or less, or no word has a box. A word with letters or digits only. */
export function wordAtPoint(el: HTMLElement, x: number, y: number): string | undefined {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  if (typeof range.getClientRects !== 'function') return undefined;
  let nearest: { word: string; gap: number } | undefined;
  let count = 0;
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    for (const m of (node.textContent ?? '').matchAll(/\S+/gu)) {
      if (!/[\p{L}\p{N}]/u.test(m[0])) continue;
      count++;
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      for (const r of range.getClientRects()) {
        const gap = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
        if (nearest === undefined || gap < nearest.gap) nearest = { word: m[0], gap };
      }
    }
  }
  return count > 1 ? nearest?.word : undefined;
}
