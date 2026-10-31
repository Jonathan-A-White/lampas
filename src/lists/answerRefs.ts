// src/lists/answerRefs.ts — the Bible references a tutor's answer names, as the canonical strings a verse list keeps (mw-5r3p30.929; src/lists/canonical.ts): 'Dan.2', 'Dan.10', 'Ezek.10.21', 'Heb.7.1-3'.
// They are the references the answer's links stand for: the Markdown is parsed and run through the plugins Markdown.tsx runs (remarkBooks, remarkVerses), so what is saved is what is drawn as a link,
// including those that lean on a book or chapter named before ('chapters 2, 7 and 10 to 12'). In the order of the answer, each once. A range of chapters ('Daniel 10-12') is kept as its chapters;
// a range of verses stays one entry. Pure.
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { stripComments } from '../markdown/comments';
import { remarkBooks } from '../markdown/bookLinks';
import { remarkVerses, writtenOf } from '../markdown/verseLinks';
import { findReferences } from '../nav/refsInText';
import { canonicalOf } from './canonical';

interface Node {
  type: string;
  url?: string;
  children?: Node[];
}

/** The addresses of the links of a tree, in the order drawn. */
function linkUrls(node: Node, into: string[] = []): string[] {
  if (node.type === 'link' && node.url !== undefined) into.push(node.url);
  for (const child of node.children ?? []) linkUrls(child, into);
  return into;
}

// 'Daniel 10-12' (a run of chapters: no verse); the book is whatever stands before the numbers
const CHAPTERS = /^(.*?\D)\s?(\d{1,3})\s?[-–]\s?(\d{1,3})$/;

/** The canonical strings a reference as written stands for: one, or one a chapter for a run of chapters. Empty for text findReferences does not read. */
function canonicalsOf(written: string): string[] {
  const run = CHAPTERS.exec(written.trim());
  if (run && !written.includes(':')) {
    const [, name, from, to] = run;
    const chapters: string[] = [];
    for (let c = Number(from); c <= Number(to) && chapters.length < 150; c++) {
      const found = findReferences(`${name.trim()} ${c}`)[0];
      if (found) chapters.push(canonicalOf(found));
    }
    return chapters;
  }
  const found = findReferences(written)[0];
  return found ? [canonicalOf(found)] : [];
}

/** The references the answer `markdown` names, as canonical strings in answer order, each once. */
export function answerReferences(markdown: string): string[] {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkBooks).use(remarkVerses);
  const tree = processor.runSync(processor.parse(stripComments(markdown))) as Node;
  const seen = new Set<string>();
  for (const url of linkUrls(tree)) {
    const written = writtenOf(url);
    if (written !== null) for (const canonical of canonicalsOf(written)) seen.add(canonical);
  }
  return [...seen];
}
