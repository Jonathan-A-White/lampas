// src/markdown/scriptRuns.ts — a remark plugin: each stretch of a script the tutor writes besides English and Greek (Hebrew, src/script/scripts.ts) in a
// text of the answer becomes a span with its language and direction (<span lang="he" dir="rtl" class="script-he">). `dir` on an inline element isolates
// it from the line around it, so right-to-left letters never turn the English order round; the class sets the bundled font.
import { scriptOf, splitScripts } from '../script/scripts';

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName: string; hProperties: Record<string, unknown> };
}

function wrap(node: MdNode): void {
  const children = node.children;
  if (!children) return;
  const next: MdNode[] = [];
  for (const child of children) {
    if (child.type !== 'text' || child.value === undefined) {
      wrap(child);
      next.push(child);
      continue;
    }
    for (const part of splitScripts(child.value)) {
      const script = part.script ? scriptOf(part.script) : undefined;
      next.push(
        script
          ? {
              type: 'script',
              data: { hName: 'span', hProperties: { lang: script.id, dir: script.dir, className: [script.className] } },
              children: [{ type: 'text', value: part.text }],
            }
          : { type: 'text', value: part.text },
      );
    }
  }
  node.children = next;
}

export function remarkScripts() {
  return (tree: MdNode): void => wrap(tree);
}
