// What Lampas says it is (mw-gdcyf98.7): the Bible in Greek and Hebrew, not 'the New Testament in Koine Greek'. The README, the overview, the page and the manifest,
// CLAUDE.md's head and the self-descriptions of the three grind parts that name the app all say it, and name the Hebrew.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = [
  'README.md',
  'docs/overview.md',
  'index.html',
  'pwa-manifest.ts',
  'CLAUDE.md',
  'grinds/bible-talk.instructions/000-bible-talk.md',
  'grinds/drill-items.instructions.md',
];

describe('what the app says it is', () => {
  for (const file of FILES) {
    const text = readFileSync(file, 'utf8');
    it(`${file} does not say "New Testament in Koine Greek"`, () => {
      expect(text).not.toMatch(/New Testament in (?:Koine )?Greek/);
    });
    it(`${file} names the Hebrew`, () => {
      expect(text).toMatch(/Hebrew/);
    });
  }

  it('the page and the manifest share one description', () => {
    const page = /<meta name="description" content="([^"]+)"/.exec(readFileSync('index.html', 'utf8'))?.[1];
    const manifest = /description: '([^']+)'/.exec(readFileSync('pwa-manifest.ts', 'utf8'))?.[1];
    expect(page).toBeTruthy();
    expect(manifest).toBe(page);
  });

  it('the About-you prompts ask about the Greek or the Hebrew', () => {
    const text = readFileSync('src/AboutYouScreen.tsx', 'utf8');
    expect(text).toContain('any Greek or Hebrew you have had before');
    expect(text).toContain('Why you are learning the Greek or the Hebrew');
  });
});
