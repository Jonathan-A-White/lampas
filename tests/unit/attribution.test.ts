import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAttribution, plainText } from '../../src/attribution';

const file = readFileSync('ATTRIBUTION.md', 'utf8');

describe('parseAttribution', () => {
  it('reads a title, an intro and bullets, joining continuation lines', () => {
    const doc = parseAttribution('# T\n\nIntro line.\n\n- **A.** one\n  two https://x.org/y.\n- three `c`\n');
    expect(doc.intro).toBe('Intro line.');
    expect(doc.entries).toEqual(['**A.** one two https://x.org/y.', 'three `c`']);
  });

  it('keeps every bullet of ATTRIBUTION.md as an entry', () => {
    const bullets = file.split('\n').filter((l) => l.startsWith('- ')).length;
    expect(parseAttribution(file).entries).toHaveLength(bullets);
  });

  it('turns markdown into plain text', () => {
    expect(plainText('**A.** see `f` and https://x.org/y.')).toBe('A. see f and https://x.org/y.');
  });
});

describe('ATTRIBUTION.md carries what CC BY 4.0 requires', () => {
  const text = plainText(file);
  it('names STEPBible, Tyndale House, the licence link and the changes', () => {
    expect(text).toContain('STEPBible');
    expect(text).toContain('Tyndale House');
    expect(text).toContain('https://creativecommons.org/licenses/by/4.0/');
    expect(text).toContain('Changes:');
  });
  it('says the MSB is public domain', () => {
    expect(text).toMatch(/Majority Standard Bible[^]*Public domain/);
  });
});
