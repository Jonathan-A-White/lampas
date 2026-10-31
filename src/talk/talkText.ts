// src/talk/talkText.ts — the whole talk as plain text, for the Talk sheet's 'Copy the whole talk' (mw-5r3p30.930): the place written out, then each of his
// questions (as the screen shows it) and each answer, in order. Pure. The answer's Markdown loses its marks and its link addresses (a link is its words, so a reference
// the tutor linked reads 'Philippians 4:13'); its paragraphs and list lines stay.
import type { TalkTurn } from '../data/repositories/talks';
import { exchangeReference } from '../share/exchange';

const IMAGE = /!\[([^\]]*)\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)/g;
const LINK = /\[([^\]]+)\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)/g;
const AUTOLINK = /<((?:https?|mailto):[^<>\s]+)>/g;

/** One answer's Markdown as plain text: marks and addresses gone, lines kept. */
export function answerPlain(markdown: string): string {
  return markdown
    .replace(IMAGE, '$1')
    .replace(LINK, '$1')
    .replace(AUTOLINK, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/`+([^`]+)`+/g, '$1')
    .trim();
}

/** The talk kept under `ref`, as the text copied: 'Talk about Romans 8:28', then 'Me:' and 'Tutor:' for each turn. */
export function talkPlainText(ref: string, turns: readonly TalkTurn[]): string {
  if (turns.length === 0) return '';
  const lines = [`Talk about ${exchangeReference(ref).label}`];
  for (const turn of turns) {
    lines.push('', `Me: ${(turn.cleanQ ?? turn.q).trim().replace(/\s*\n\s*/g, ' ')}`, '', `Tutor: ${answerPlain(turn.a)}`);
  }
  return lines.join('\n');
}
