// The five lessons on variant readings (mw-9ji6ek0.17): in order, each short (350 to 700 words), each ending in its Sources with a link, every link
// https and one of the sources index.ts lists (each fetched once and answering 200 before it went in), and never a ruling on which reading is right.
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VARIANT_LESSONS, VARIANT_LESSON_SOURCES } from '../../src/lessons/variants';

const FILES = ['01-what-a-variant-is.md', '02-why-manuscripts-differ.md', '03-byzantine-na-ecm.md', '04-how-to-read-a-variant.md', '05-when-it-matters.md'];

/** Every address a page links to: [text](url), <url> and any bare address. */
const linksOf = (md: string): string[] => [...md.matchAll(/\]\(([^)\s]+)\)|<([a-z]+:[^>\s]+)>|(?<![(<])\b((?:https?|ftp):\/\/[^\s)>]+)/gi)].map((m) => m[1] ?? m[2] ?? m[3]);

/** The words a reader reads: a link counts as its text, not its address, and the marks of Markdown are not words. */
const wordsOf = (md: string): number =>
  md
    .replace(/\]\([^)]*\)/g, ']')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** The page after its last '## ' heading, and that heading. */
const lastSection = (md: string): { heading: string; body: string } => {
  const at = md.lastIndexOf('\n## ');
  const rest = md.slice(at + 1);
  const end = rest.indexOf('\n');
  return { heading: rest.slice(0, end).trim(), body: rest.slice(end + 1) };
};

describe('the lessons on variant readings', () => {
  it('are five pages, in order, one file each, every file in the folder a lesson', () => {
    expect(VARIANT_LESSONS.map((l) => l.file)).toEqual(FILES);
    expect(VARIANT_LESSONS.map((l) => l.order)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(VARIANT_LESSONS.map((l) => l.id)).size).toBe(5);
    const here = readdirSync('src/lessons/variants').filter((f) => f.endsWith('.md'));
    expect(here.sort()).toEqual(FILES);
  });

  it('give each page its title as its first heading', () => {
    for (const l of VARIANT_LESSONS) expect(l.markdown.split('\n')[0], l.file).toBe(`# ${l.title}`);
    expect(VARIANT_LESSONS[2].title).toBe('Byzantine, Nestle-Aland and ECM');
  });

  it('keep each page between 350 and 700 words', () => {
    for (const l of VARIANT_LESSONS) {
      const n = wordsOf(l.markdown);
      expect(n, `${l.file}: ${n} words`).toBeGreaterThanOrEqual(350);
      expect(n, `${l.file}: ${n} words`).toBeLessThanOrEqual(700);
    }
  });

  it('end each page in its Sources, with at least one link', () => {
    for (const l of VARIANT_LESSONS) {
      const { heading, body } = lastSection(l.markdown);
      expect(heading, l.file).toBe('## Sources');
      expect(linksOf(body).length, l.file).toBeGreaterThanOrEqual(1);
    }
  });

  it('link only over https, and only to the sources index.ts lists, each of which a page uses', () => {
    for (const s of VARIANT_LESSON_SOURCES) expect(s).toMatch(/^https:\/\/[^\s]+$/);
    const used = new Set<string>();
    for (const l of VARIANT_LESSONS) {
      for (const link of linksOf(l.markdown)) {
        expect(link, l.file).toMatch(/^https:\/\//);
        expect(VARIANT_LESSON_SOURCES, `${l.file}: ${link}`).toContain(link);
        used.add(link);
      }
    }
    expect([...VARIANT_LESSON_SOURCES].filter((s) => !used.has(s))).toEqual([]);
  });

  it('never rule on which reading is right', () => {
    for (const l of VARIANT_LESSONS) {
      const text = l.markdown.toLowerCase().replace(/\s+/g, ' ');
      expect(text, l.file).not.toContain('is the correct reading');
      expect(text, l.file).not.toContain('the original reading is');
    }
  });

  it('say on page 3 that ECM readings are in Acts only, at 18 places', () => {
    const three = VARIANT_LESSONS[2].markdown.replace(/\s+/g, ' ');
    expect(three).toMatch(/Acts/);
    expect(three).toMatch(/\b18 places\b/);
  });

  it('say a badge opens the sheet and a word its card, never that a brace does (mw-9ji6ek0.40)', () => {
    const four = VARIANT_LESSONS[3].markdown;
    const sheet = four.slice(four.indexOf('## The sheet'), four.indexOf('## Read this'));
    const first = sheet.split('\n').find((line, k) => k > 0 && line.trim() !== '') ?? '';
    expect(first).toMatch(/badge/);
    expect(first).toMatch(/\*\*B\*\*/);
    expect(first).toMatch(/word card/);
    expect(first).toMatch(/left out/);
    for (const l of VARIANT_LESSONS) expect(l.markdown, l.file).not.toMatch(/\b(tap|tapping) (a|the) brace\b/i);
  });
});
