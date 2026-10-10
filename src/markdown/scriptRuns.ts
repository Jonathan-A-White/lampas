// src/markdown/scriptRuns.ts — a remark plugin: each stretch of a script the tutor writes besides English and Greek (Hebrew, src/script/scripts.ts) in a
// text of the answer becomes a span with its language and direction (<span lang="he" dir="rtl" class="script-he">). `dir` on an inline element isolates
// it from the line around it, so right-to-left letters never turn the English order round; the class sets the bundled font.
// Greek is marked too (mw-y3qno5.1): each stretch of Greek letters is <span lang="grc" class="font-greek">, which Markdown.tsx draws as a word to tap (src/script/GreekWord.tsx),
// so a word the tutor quotes from a picture, or anywhere else in an answer, is there to hear. Greek inside a link stays plain text: a button cannot sit in a link.
import { scriptOf, splitScripts } from '../script/scripts';

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName: string; hProperties: Record<string, unknown> };
}

// Greek words with only spaces between them are one stretch (the same cut speech/answerRuns.ts makes), so a quoted phrase is one word to tap.
const GREEK_WORD = '\\p{Script=Greek}[\\p{Script=Greek}\\p{M}]*';
const GREEK_STRETCH = new RegExp(`${GREEK_WORD}(?:[ \\u00a0]+${GREEK_WORD})*`, 'gu');

const greekSpan = (text: string): MdNode => ({
  type: 'script',
  data: { hName: 'span', hProperties: { lang: 'grc', className: ['font-greek'] } },
  children: [{ type: 'text', value: text }],
});

/** `text` with each stretch of Greek letters a span of its own. */
function greekNodes(text: string): MdNode[] {
  const nodes: MdNode[] = [];
  let at = 0;
  for (const m of text.matchAll(GREEK_STRETCH)) {
    if (m.index > at) nodes.push({ type: 'text', value: text.slice(at, m.index) });
    nodes.push(greekSpan(m[0]));
    at = m.index + m[0].length;
  }
  if (nodes.length === 0) return [{ type: 'text', value: text }];
  if (at < text.length) nodes.push({ type: 'text', value: text.slice(at) });
  return nodes;
}

function wrap(node: MdNode, inLink = false): void {
  const children = node.children;
  if (!children) return;
  const next: MdNode[] = [];
  for (const child of children) {
    if (child.type !== 'text' || child.value === undefined) {
      wrap(child, inLink || child.type === 'link' || child.type === 'linkReference');
      next.push(child);
      continue;
    }
    for (const part of splitScripts(child.value)) {
      const script = part.script ? scriptOf(part.script) : undefined;
      if (script) {
        next.push({
          type: 'script',
          data: { hName: 'span', hProperties: { lang: script.id, dir: script.dir, className: [script.className] } },
          children: [{ type: 'text', value: part.text }],
        });
      } else if (inLink) {
        next.push({ type: 'text', value: part.text });
      } else {
        next.push(...greekNodes(part.text));
      }
    }
  }
  node.children = next;
}

export function remarkScripts() {
  return (tree: MdNode): void => wrap(tree);
}
