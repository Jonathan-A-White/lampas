// src/markdown/plain.ts — the tutor's Markdown as plain text, for speech: the marks (stars, hashes, list bullets, backticks,
// link addresses) are never spoken. A port of Postern's src/markdown/plain.ts (its mermaid case dropped). A line that ends
// without a stop gets one, so the voice pauses between list items and headings.

const FENCE = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/;
const LINE_PREFIX = /^\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)?/;
const RULE = /^\s*(?:[-*_]\s*){3,}$/;
const CODE_SPAN = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g;
const IMAGE = /!\[([^\]]*)\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)/g;
const LINK = /\[([^\]]+)\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)/g;
const AUTOLINK = /<((?:https?|mailto):[^<>\s]+)>/g;
const STRIKE = /~~(?=\S)([\s\S]*?\S)~~/g;
const EMPHASIS = /(?<![\w*])(\*{1,3})(?=[^\s*])([^*]*?[^\s*])\1(?![\w*])/g;
const UNDERSCORE = /(?<![\w_])(_{1,3})(?=[^\s_])([^_]*?[^\s_])\1(?![\w_])/g;
const STOP = /[.!?;:…]["')\]”’]*$/;

function inlineToPlain(line: string): string {
  const code: string[] = [];
  let out = line.replace(CODE_SPAN, (_m, _ticks: string, body: string) => {
    code.push(body.trim());
    return `${code.length - 1}`;
  });
  out = out.replace(IMAGE, '$1').replace(LINK, '$1').replace(AUTOLINK, '$1');
  out = out.replace(STRIKE, '$1').replace(EMPHASIS, '$2').replace(UNDERSCORE, '$2');
  return out.replace(/(\d+)/g, (_m, i: string) => code[Number(i)]);
}

/** Markdown as one line of words to say: no marks, a stop at the end of each line that lacks one. */
export function markdownToSpeech(text: string): string {
  const pieces: string[] = [];
  let fence: string | undefined;
  const add = (line: string): void => {
    const plain = inlineToPlain(line).trim();
    if (plain) pieces.push(STOP.test(plain) ? plain : `${plain}.`);
  };
  for (const line of text.split(/\r?\n/)) {
    if (fence) {
      const close = FENCE.exec(line);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length && !close[2]) fence = undefined;
      else add(line);
      continue;
    }
    const open = FENCE.exec(line);
    if (open) {
      fence = open[1];
      continue;
    }
    if (RULE.test(line)) continue;
    add(line.replace(LINE_PREFIX, ''));
  }
  return pieces.join(' ').replace(/\s+/g, ' ').trim();
}
