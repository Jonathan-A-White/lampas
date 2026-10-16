// The bible-talk and verse-ask instructions are one part per section (mw-skwocd.8): grinds/<kind>.instructions/NNN-<section>.md, which the mill
// reads in name order, joined by a blank line (millwright mw-skwocd.7). The split changed no byte: the parts joined are the file they came from,
// read from git (the commit that deleted the file and its parent; before that commit, the working tree's parts and HEAD's file). Every test reads
// a grind's instructions through scripts/grind-parts.ts instructionsOf, never by path, so no test reads half of them.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { instructionParts, instructionsOf, instructionsPath } from '../../scripts/grind-parts';
import { SETTINGS_BEGIN, SETTINGS_END, joinGrindParts } from '../../src/settings/grindText';

const SPLIT = ['bible-talk', 'verse-ask'] as const;

const git = (args: string): string => execSync(`git ${args}`, { encoding: 'utf8', maxBuffer: 1 << 26 });

/** The file as it was before the split, and the parts that replaced it, joined. */
function beforeAndAfter(kind: string): { before: string; joined: string } {
  const file = `grinds/${kind}.instructions.md`;
  const deleted = git(`log -1 --full-history --diff-filter=D --format=%H -- ${file}`).trim();
  if (!deleted) return { before: git(`show HEAD:${file}`), joined: instructionsOf(kind) };
  const names = git(`ls-tree --name-only ${deleted} grinds/${kind}.instructions/`)
    .split('\n')
    .filter((name) => name.endsWith('.md'))
    .sort();
  return { before: git(`show ${deleted}^:${file}`), joined: joinGrindParts(names.map((name) => git(`show ${deleted}:${name}`))) };
}

describe('joinGrindParts', () => {
  it('joins the parts as the mill does: one blank line between them, the last part kept whole', () => {
    expect(joinGrindParts(['First.\n', 'Second.\n', 'Third.'])).toBe('First.\n\nSecond.\n\nThird.');
    expect(joinGrindParts(['First.\n', 'Second.\n\n', 'Third.\n'])).toBe('First.\n\nSecond.\n\nThird.\n');
    expect(joinGrindParts(['Only.\n'])).toBe('Only.\n');
  });
});

describe.each(SPLIT)('grinds/%s.instructions/', (kind) => {
  it('is what grinds/<kind>.json names, a directory', () => {
    expect(instructionsPath(kind)).toBe(`grinds/${kind}.instructions`);
    expect(statSync(instructionsPath(kind)).isDirectory()).toBe(true);
  });

  it('holds one part per section, numbered in the order they are read, the title first', () => {
    const parts = instructionParts(kind);
    expect(readdirSync(instructionsPath(kind)).sort()).toEqual(parts.map((p) => p.file.split('/').pop()));
    for (const { file, text } of parts) {
      expect(file).toMatch(/\/\d{3}-[a-z0-9]+(-[a-z0-9]+)*\.md$/);
      expect(text.endsWith('\n') && !text.endsWith('\n\n'), `${file} ends in one newline`).toBe(true);
    }
    expect(parts[0].text).toMatch(/^# /);
    for (const { file, text } of parts.slice(1)) {
      expect(text, file).toMatch(/^## /);
      expect(text.match(/^## /gm), `${file} holds one section`).toHaveLength(1);
    }
  });

  it('joined, is the file it was split from, byte for byte', () => {
    const { before, joined } = beforeAndAfter(kind);
    expect(joined.length).toBeGreaterThan(1000);
    expect(joined).toBe(before);
  });
});

describe('the settings list npm run grind:build writes', () => {
  it('sits whole in one part of the bible-talk instructions', () => {
    const holding = instructionParts('bible-talk').filter(({ text }) => text.includes(SETTINGS_BEGIN) || text.includes(SETTINGS_END));
    expect(holding.map(({ file }) => file)).toEqual(['grinds/bible-talk.instructions/330-changing-the-apps-settings.md']);
    expect(holding[0].text.indexOf(SETTINGS_BEGIN)).toBeLessThan(holding[0].text.indexOf(SETTINGS_END));
  });
});

describe('every test reads a grind\'s instructions through instructionsOf', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { recursive: true })
      .map(String)
      .filter((name) => /\.tsx?$/.test(name))
      .map((name) => `${dir}/${name}`);

  it('has no test or step that reads an instructions file by its path', () => {
    const readers = [...files('tests'), ...files('features')].filter((file) =>
      /readFileSync\([^)]*instructions|read\([^)]*instructions/.test(readFileSync(file, 'utf8')),
    );
    expect(readers).toEqual([]);
  });
});
