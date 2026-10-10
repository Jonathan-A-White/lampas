// tests/unit/research-kjv-tr.test.ts — docs/research/kjv-tr.md answers the story's questions (mw-5r3p30.137).
// The report is research only: it must exist, show each source with a URL, a licence and John 1:1 in its native format, cover the
// word-by-word alignment and the size of the data, and name the files each proposed story would touch.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FILE = join(__dirname, '../../docs/research/kjv-tr.md');
const text = (): string => readFileSync(FILE, 'utf8');
const section = (title: RegExp): string => {
  const parts = text().split(/^## /m).slice(1);
  const found = parts.find((p) => title.test(p.split('\n')[0]));
  expect(found, `a section titled ${title}`).toBeTruthy();
  return found as string;
};

describe('docs/research/kjv-tr.md', () => {
  it('exists', () => {
    expect(existsSync(FILE)).toBe(true);
  });

  it('shows the KJV text with a URL, a licence and John 1:1 in its native format', () => {
    const kjv = section(/King James/i);
    expect(kjv).toMatch(/https:\/\/\S+/);
    expect(kjv).toMatch(/licen[cs]e/i);
    expect(kjv).toMatch(/John\.1\.1/);
    expect(kjv).toMatch(/strong:G746/);
  });

  it('shows the 1894 Textus Receptus with a URL, a licence and John 1:1 in its native format', () => {
    const tr = section(/Textus Receptus|Scrivener/i);
    expect(tr).toMatch(/https:\/\/\S+/);
    expect(tr).toMatch(/licen[cs]e|public domain/i);
    expect(tr).toMatch(/1:1 /);
    expect(tr).toMatch(/\{N-DSF\}/);
  });

  it('covers the word-by-word alignment against the MSB and RP and the size of the data', () => {
    const alignment = section(/alignment/i);
    expect(alignment).toMatch(/MSB/);
    expect(alignment).toMatch(/RP/);
    expect(alignment).toMatch(/src/);
    expect(section(/size/i)).toMatch(/MB/);
  });

  it('proposes stories and names the files each would touch', () => {
    const stories = section(/stor/i);
    const items = stories.split(/^### /m).slice(1);
    expect(items.length).toBeGreaterThanOrEqual(4);
    for (const item of items) expect(item, item.split('\n')[0]).toMatch(/Files:.*(src|scripts|public|docs|grinds|tests)\//);
  });
});
