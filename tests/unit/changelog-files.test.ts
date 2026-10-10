// public/changelog.json (what the app reads) and CHANGELOG.md (what the version link opens on GitHub) are written by
// the factory at each landing (millwright's domain/changelog.go); this holds the two to the shape the screens and
// the link need: every entry well formed, newest first, and a '## <version>' heading in the markdown for each version.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareVersions, parseChangelog } from 'bsv-kit/whats-new';

const raw: unknown = JSON.parse(readFileSync('public/changelog.json', 'utf8'));
const md = readFileSync('CHANGELOG.md', 'utf8');

describe('the changelog files', () => {
  it('has entries, and every one is well formed (the package drops any that is not)', () => {
    expect(Array.isArray(raw)).toBe(true);
    expect((raw as unknown[]).length).toBeGreaterThan(0);
    expect(parseChangelog(raw)).toHaveLength((raw as unknown[]).length);
  });

  it('is newest first', () => {
    const versions = parseChangelog(raw).map((e) => e.version);
    for (let i = 1; i < versions.length; i++) expect(compareVersions(versions[i - 1], versions[i])).toBeGreaterThanOrEqual(0);
  });

  it('has a heading in CHANGELOG.md for every version, which the version link lands on', () => {
    const headings = [...md.matchAll(/^## (\S+)$/gm)].map((m) => m[1]);
    for (const { version } of parseChangelog(raw)) expect(headings).toContain(version);
  });

  it('starts the markdown with its title', () => {
    expect(md.startsWith("# What's new\n")).toBe(true);
  });
});
