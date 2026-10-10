// src/share/exchange.ts — one question and its answer written as Markdown, to copy and share (mw-5r3p30.104). Pure: the reference as a link to
// Lampas, '**Q:**' and his question as the screen shows it (cleaned when the tutor cleaned it), then the answer as the tutor wrote it.
import { LINK_ORIGIN } from '../config';
import { titleOf } from '../data/books';
import { OSIS, passageUrl, referenceUrl } from '../nav/links';

/** What the exchange is about, in words, and where a link to it goes. */
export interface ExchangeReference {
  label: string;
  url: string;
}

/** The place a kept exchange belongs to, from the key it is kept under: a verse 'rom.8.28', a passage 'rom.8.1-11', a chapter 'rom.8' (a quiz key
 * 'rom.8.1-11:quiz' is its passage), or a talk from a screen 'screen.goal' (no text: the app itself). Anything else is the app. */
export function exchangeReference(ref: string): ExchangeReference {
  const screen = /^screen\.(.+)$/.exec(ref);
  if (screen) return { label: `Lampas: ${screen[1].replace(/-/g, ' ')}`, url: LINK_ORIGIN };
  const place = /^([0-9a-z]+)\.(\d+)(?:\.(\d+)(?:-(\d+))?)?(?::quiz)?$/.exec(ref);
  if (!place || !(place[1] in OSIS)) return { label: 'Lampas', url: LINK_ORIGIN };
  const [, book, chapterText, firstText, lastText] = place;
  const chapter = Number(chapterText);
  if (firstText === undefined) return { label: titleOf(book, chapter), url: referenceUrl(book, chapter) };
  const first = Number(firstText);
  if (lastText === undefined) return { label: `${titleOf(book, chapter)}:${first}`, url: referenceUrl(book, chapter, first) };
  return { label: `${titleOf(book, chapter)}:${first}-${lastText}`, url: passageUrl(book, chapter, first, Number(lastText)) };
}

/** The exchange as Markdown: `[Romans 8:28](link)`, then `**Q:** question`, then the answer. A question is one paragraph, so its line breaks become spaces. */
export function exchangeMarkdown(ref: string, question: string, answer: string): string {
  const { label, url } = exchangeReference(ref);
  return `[${label}](${url})\n\n**Q:** ${question.trim().replace(/\s*\n\s*/g, ' ')}\n\n${answer.trim()}`;
}
