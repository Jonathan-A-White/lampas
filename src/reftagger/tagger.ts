// src/reftagger/tagger.ts — the blog's tagger (mw-5r3p30.1043): every Bible reference in a post's text becomes a plain link to that passage in Lampas. It replaces Logos RefTagger,
// whose tap opened a NET popover. The reading of a reference is the Reader's own (nav/refsInText.ts over nav/links.ts, never a second table of books), so the blog and the
// Reader agree on what a reference is. Only the text of a post (a `root`) is read; text already in a link, in code or in a heading is left alone, and so is every link already there.
import { referenceUrl } from '../nav/links';
import { referenceSpans } from '../nav/refsInText';

/** Where text is never tagged: a link already (its address is never changed), code, a heading, a form's field, a script or a stylesheet. */
const LEAVE = /^(?:A|CODE|PRE|KBD|SAMP|VAR|BUTTON|SELECT|OPTION|TEXTAREA|INPUT|LABEL|SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|MATH|H[1-6])$/;

/** The mark on a link the tagger made, which also keeps a second run from tagging again. */
export const MARK = 'data-lampas-ref';

/** The address of a reference's link: the https form Lampas takes in, `ref=John.5.24-29` (a verse range names where to start). */
const addressOf = (ref: string, lastVerse: number | undefined): string => {
  const [book, chapter, verse] = ref.split('.');
  const url = referenceUrl(book, Number(chapter), verse === undefined ? undefined : Number(verse));
  return lastVerse === undefined ? url : `${url}-${lastVerse}`;
};

const isLeft = (node: Node, root: Element): boolean => {
  for (let at = node.parentElement; at; at = at.parentElement) {
    if (LEAVE.test(at.tagName.toUpperCase()) || at.hasAttribute(MARK) || (at as HTMLElement).isContentEditable) return true;
    if (at === root) return false;
  }
  return false;
};

/** Links every reference in the text of `root`; returns how many links it made. */
export function tagReferences(root: Element): number {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!isLeft(node, root)) texts.push(node as Text);
  }
  let made = 0;
  for (const node of texts) {
    const text = node.data;
    const spans = referenceSpans(text, { semicolons: true });
    if (spans.length === 0) continue;
    const pieces = root.ownerDocument.createDocumentFragment();
    let at = 0;
    for (const span of spans) {
      if (span.start > at) pieces.append(text.slice(at, span.start));
      const link = root.ownerDocument.createElement('a');
      link.href = addressOf(span.ref, span.lastVerse);
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute(MARK, '');
      link.textContent = text.slice(span.start, span.end);
      pieces.append(link);
      at = span.end;
      made += 1;
    }
    if (at < text.length) pieces.append(text.slice(at));
    node.replaceWith(pieces);
  }
  return made;
}

/** The text of a post: Ghost's `.gh-content`. The title, the menus, the footer and the comments are outside it. */
export const POST_TEXT = '.gh-content';
