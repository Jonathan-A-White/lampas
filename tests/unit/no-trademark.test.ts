// "Thompson Chain-Reference" is the trademark of the publisher of the current editions (mw-qtu3zvz.4, docs/sources/sermon-index.md section 7). The app credits Frank Charles Thompson's work and CrossWire's module by name
// and uses the trademark for no feature: the source is "Thompson Chain Topics", the line under a verse is "Themes". ATTRIBUTION.md may name the work as the module's own About line does; nothing the app ships or reads may.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MARK = /Chain[- ]Reference/i;

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx|json|css|html|md)$/.test(e.name))
    .map((e) => join(e.parentPath, e.name));

describe('the trademark of the Thompson Chain-Reference Bible', () => {
  it('is in no file of src/', () => {
    const found = filesUnder('src').filter((f) => MARK.test(readFileSync(f, 'utf8')));
    expect(found).toEqual([]);
  });

  it('is in no file the app reads from public/themes (index.json keeps the licence line alone)', () => {
    expect(MARK.test(readFileSync('public/themes/index.json', 'utf8'))).toBe(false);
    const found = filesUnder('public/themes').filter((f) => MARK.test(readFileSync(f, 'utf8')));
    expect(found).toEqual([]);
  });

  it('is named in ATTRIBUTION.md only to say it is not used', () => {
    const attribution = readFileSync('ATTRIBUTION.md', 'utf8');
    for (const line of attribution.split('\n').filter((l) => MARK.test(l))) expect(line).toMatch(/trademark/i);
  });
});
