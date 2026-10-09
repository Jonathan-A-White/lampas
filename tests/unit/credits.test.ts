// The credits rule (vault: pwa-best-practices/29-credits-and-attribution.md): every runtime dependency is credited by name
// with a link, a licence and its changes; link text is a name, never a raw URL; the About opens with Newton's line.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { attribution, parseAttribution, plainText } from '../../src/attribution';

const md = readFileSync('ATTRIBUTION.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> };
const readme = readFileSync('README.md', 'utf8');
const LINK = /\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g;

describe('every runtime dependency is credited', () => {
  const credited = (name: string): string | undefined => attribution.entries.find((e) => e.includes(`\`${name}\``));
  for (const name of Object.keys(pkg.dependencies)) {
    it(`${name} has an entry that names its package`, () => {
      expect(credited(name), `${name} is in package.json dependencies but no entry of ATTRIBUTION.md names \`${name}\``).toBeDefined();
    });
    it(`${name}'s entry has a named link, a licence and its changes`, () => {
      const entry = credited(name) ?? '';
      expect([...entry.matchAll(LINK)].length).toBeGreaterThanOrEqual(2);
      expect(entry).toMatch(/Licen[cs]e/);
      expect(entry).toMatch(/Changes:/);
    });
  }
});

describe('the credits are written for a phone', () => {
  it('has no raw URL anywhere: a link is [Name](url)', () => {
    const withoutLinks = md.replace(LINK, (_m, text: string) => text).replace(/\]\(/g, '');
    expect(withoutLinks.match(/https?:\/\//g)).toBeNull();
  });
  it('never uses a URL as the link text', () => {
    for (const m of md.matchAll(LINK)) expect(m[1]).not.toMatch(/^https?:|\.(com|org|academy)\b/i);
  });
  it('gives every entry a link', () => {
    for (const entry of attribution.entries) expect(entry, entry).toMatch(LINK);
  });
});

describe('the credits cover the sources that are not packages', () => {
  const text = plainText(md);
  it.each([
    'Majority Standard Bible',
    'STEPBible',
    'Gentium Plus',
    'Biblical Mastery Academy',
    'WhatsOnChain',
    'Logos',
    'Accordance',
    'Postern',
    'Beads',
    'Gas Town',
    'Claude Code',
  ])('names %s', (name) => {
    expect(text).toContain(name);
  });
});

describe('the About opens with Newton', () => {
  it("quotes the 1675 letter to Hooke with its attribution, then says why we credit", () => {
    expect(attribution.quote?.text).toBe('If I have seen further it is by standing on the shoulders of Giants.');
    expect(attribution.quote?.by).toMatch(/Isaac Newton.*letter to Robert Hooke.*1675/);
    expect(attribution.intro).toMatch(/credit/i);
  });
});

describe('the README credits the same list', () => {
  it('has a Credits section that points at ATTRIBUTION.md and the About screen and carries the quote', () => {
    const section = readme.split(/^## /m).find((s) => s.startsWith('Credits'));
    expect(section).toBeDefined();
    expect(section).toContain('ATTRIBUTION.md');
    expect(section).toContain('About');
    expect(section).toContain(attribution.quote?.text ?? 'missing');
  });
});

describe('parseAttribution reads quotes, sections and links', () => {
  it('reads a quote with its by-line, ## sections and [Name](url) links', () => {
    const doc = parseAttribution('# T\n\n> Quoted words.\n> — Someone, 1675\n\nWhy.\n\n## Texts\n\n- **[A](https://a.org)** one\n\n## Tools\n\n- [B](https://b.org) two\n');
    expect(doc.quote).toEqual({ text: 'Quoted words.', by: 'Someone, 1675' });
    expect(doc.intro).toBe('Why.');
    expect(doc.sections.map((s) => s.title)).toEqual(['Texts', 'Tools']);
    expect(doc.entries).toEqual(['**[A](https://a.org)** one', '[B](https://b.org) two']);
  });
  it('shows a link as its name in plain text', () => {
    expect(plainText('see [STEPBible](https://www.stepbible.org/) now')).toBe('see STEPBible now');
  });
});
