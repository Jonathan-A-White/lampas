import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { runSweep, sweepChapter, sweepMarkdown } from '../../scripts/numeral-sweep';

const chapterOf = (code: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${code}/${n}.json`, 'utf8')) as Chapter;

describe('the numeral sweep', () => {
  it('Genesis 14:14 is a phrase of 318 that its English says, John 21:11 one of 153', () => {
    const gen = sweepChapter('gen', chapterOf('gen', 14)).filter((f) => f.ref === 'gen 14:14');
    expect(gen).toHaveLength(1);
    expect(gen[0]).toMatchObject({ sum: 318, line: '8 + 10 + 300 = 318', status: 'match', language: 'hbo' });
    const jhn = sweepChapter('jhn', chapterOf('jhn', 21)).filter((f) => f.ref === 'jhn 21:11');
    expect(jhn[0]).toMatchObject({ sum: 153, status: 'match', language: 'grc' });
  });

  it('a phrase whose English says another number is a mismatch, and the document lists it', () => {
    const figures = sweepChapter('gen', chapterOf('gen', 5));
    const split = figures.find((f) => f.ref === 'gen 5:5')!;
    expect(split.status).toBe('mismatch');
    const text = sweepMarkdown({ sources: [{ name: 'Hebrew Old Testament', chapters: 1, figures }] });
    expect(text).toContain('## Mismatches');
    expect(text).toContain('| gen 5:5 |');
  });

  it('writes the document, and a second run on the same files writes the same bytes', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'numeral-sweep-')), 'sweep.md');
    const none = join(tmpdir(), 'numeral-sweep-no-lxx');
    const first = runSweep(['--out', out, '--lxx', none]);
    expect(first.changed).toBe(true);
    const second = runSweep(['--out', out, '--lxx', none]);
    expect(second.changed).toBe(false);
    expect(readFileSync(out, 'utf8')).toContain('# Numeral sweep');
    expect(first.sweep.sources.map((s) => s.name)).toEqual(['Hebrew Old Testament', 'Greek New Testament', 'Septuagint (no shipped chapter found)']);
  });
});
