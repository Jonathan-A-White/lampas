// src/attribution.ts — ATTRIBUTION.md is the one source of the credits: the About screen is built from it,
// so what the app shows and what the repository says cannot differ. Only the markdown that file uses is read:
// a title, a '> ' quote whose last line begins '— ', an intro paragraph, '## ' sections of '- ' bullets (continued by
// indented lines), **bold**, `code` and [Name](https://…) links (a link's text is a name, never a web address).
import attributionMd from '../ATTRIBUTION.md?raw';

export interface Quote {
  text: string;
  by: string;
}

export interface Section {
  /** null for bullets that come before the first '## ' heading */
  title: string | null;
  entries: string[];
}

export interface Attribution {
  quote: Quote | null;
  intro: string;
  sections: Section[];
  /** every bullet of every section, in order */
  entries: string[];
}

export function parseAttribution(md: string): Attribution {
  const quote: string[] = [];
  let by = '';
  const intro: string[] = [];
  const sections: Section[] = [];
  const current = (): Section => {
    if (sections.length === 0) sections.push({ title: null, entries: [] });
    return sections[sections.length - 1];
  };
  for (const line of md.split('\n')) {
    if (line.startsWith('# ') || line.trim() === '') continue;
    if (line.startsWith('## ')) sections.push({ title: line.slice(3).trim(), entries: [] });
    else if (line.startsWith('> ')) {
      const text = line.slice(2).trim();
      if (text.startsWith('— ')) by = text.slice(2).trim();
      else quote.push(text);
    } else if (line.startsWith('- ')) current().entries.push(line.slice(2).trim());
    else if (/^\s/.test(line) && sections.length > 0 && current().entries.length > 0) current().entries[current().entries.length - 1] += ` ${line.trim()}`;
    else if (sections.length === 0) intro.push(line.trim());
  }
  return {
    quote: quote.length > 0 ? { text: quote.join(' '), by } : null,
    intro: intro.join(' '),
    sections,
    entries: sections.flatMap((s) => s.entries),
  };
}

export const attribution: Attribution = parseAttribution(attributionMd);

/** The text as it reads on screen: no markdown marks, a link as its name. */
export function plainText(md: string): string {
  return md.replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '');
}
