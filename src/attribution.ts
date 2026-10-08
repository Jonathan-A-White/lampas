// src/attribution.ts — ATTRIBUTION.md is the one source of the credits: the About screen is built from it,
// so what the app shows and what the repository says cannot differ. Only the markdown that file uses is read:
// a title, an intro paragraph, '- ' bullets (continued by indented lines), **bold**, `code` and bare URLs.
import attributionMd from '../ATTRIBUTION.md?raw';

export interface Attribution {
  intro: string;
  entries: string[];
}

export function parseAttribution(md: string): Attribution {
  const intro: string[] = [];
  const entries: string[] = [];
  for (const line of md.split('\n')) {
    if (line.startsWith('# ') || line.trim() === '') continue;
    if (line.startsWith('- ')) entries.push(line.slice(2).trim());
    else if (/^\s/.test(line) && entries.length > 0) entries[entries.length - 1] += ` ${line.trim()}`;
    else if (entries.length === 0) intro.push(line.trim());
  }
  return { intro: intro.join(' '), entries };
}

export const attribution: Attribution = parseAttribution(attributionMd);

/** A URL in the text, without the sentence punctuation that may follow it. */
export const URL_PATTERN = /https?:\/\/[^\s)]*[^\s).,;]/g;

/** The text as it reads on screen: no markdown marks. */
export function plainText(md: string): string {
  return md.replace(/\*\*/g, '').replace(/`/g, '');
}
