// A link from the app into this repo's docs on GitHub opens at the section it names (mw-5r3p30.856): the Governor tapped the Sources link of a variant lesson
// to docs/data.md and landed at the top of 472 lines. A link from a lesson carries an #anchor; any anchor in src/ is the GitHub slug of a heading that exists.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const BASE = 'https://github.com/Jonathan-A-White/lampas/blob/main/';
const LINK = /https:\/\/github\.com\/Jonathan-A-White\/lampas\/blob\/main\/([^\s)"'`#]+\.md)(#[^\s)"'`]*)?/g;

const filesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.(md|ts|tsx)$/.test(name) ? [path] : [];
  });

/** GitHub's anchor for each heading of a Markdown file: lower case, punctuation dropped, spaces to hyphens, a repeat numbered -1, -2 ... */
const anchorsOf = (markdown: string): Set<string> => {
  const seen = new Map<string, number>();
  const anchors = new Set<string>();
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const m = !fenced && /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const slug = m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    anchors.add(n === 0 ? slug : `${slug}-${n}`);
  }
  return anchors;
};

interface Found { file: string; doc: string; anchor: string | undefined }
const found: Found[] = filesUnder(join(ROOT, 'src')).flatMap((path) =>
  [...readFileSync(path, 'utf8').matchAll(LINK)].map((m) => ({ file: relative(ROOT, path), doc: m[1], anchor: m[2]?.slice(1) })),
);

describe('links from the app into this repo’s docs on GitHub', () => {
  it('are found (the test is not reading nothing)', () => {
    expect(found.filter((f) => f.file.startsWith('src/lessons/')).length).toBeGreaterThanOrEqual(4);
    expect(BASE).toContain('Jonathan-A-White/lampas');
  });

  it('from a lesson, carry an #anchor', () => {
    const bare = found.filter((f) => f.file.startsWith('src/lessons/') && !f.anchor).map((f) => `${f.file}: ${f.doc}`);
    expect(bare, 'a lesson’s link opens a doc at the top unless it names the section').toEqual([]);
  });

  it('point at a doc that exists and, with an #anchor, at a heading of it', () => {
    const bad: string[] = [];
    for (const f of found) {
      let text: string;
      try {
        text = readFileSync(join(ROOT, f.doc), 'utf8');
      } catch {
        bad.push(`${f.file}: ${f.doc} does not exist`);
        continue;
      }
      if (f.anchor && !anchorsOf(text).has(f.anchor)) bad.push(`${f.file}: ${f.doc}#${f.anchor} is no heading of it`);
    }
    expect(bad).toEqual([]);
  });

  it('slug a heading as GitHub does', () => {
    expect([...anchorsOf('# The Bible data\n## `index.json`\n## Variants\n## Variant English\n## Variants\n```\n# not a heading\n```\n')])
      .toEqual(['the-bible-data', 'indexjson', 'variants', 'variant-english', 'variants-1']);
  });
});
