// tests/unit/card-audit.test.ts — docs/card-audit.md (mw-5r3p30.234) judges every card of the grammar ladder for a total beginner: one row per
// LADDER idea, with its verdict on the card as it was and what a beginner lacked on it, so no card is skipped and none is listed that the ladder has not.
// The Hebrew ladder (mw-gdcyf98.9) has its own block after the Greek one, held to the same rules.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LADDER } from '../../src/data/grammar/ladder';
import { HEBREW_LADDER } from '../../src/data/grammar/hebrew/ladder';

const VERDICTS = ['teaches a beginner', 'only reminds someone who knows'];

/** The table rows of the audit's block `name` ('audit' for the Greek ladder, 'audit-hbo' for the Hebrew one): | id | title | verdict | what a beginner lacked | */
function rows(name = 'audit'): { id: string; title: string; verdict: string; lacked: string }[] {
  const doc = readFileSync('docs/card-audit.md', 'utf8');
  const block = doc.slice(doc.indexOf(`<!-- ${name}:begin`), doc.indexOf(`<!-- ${name}:end -->`));
  return block
    .split('\n')
    .filter((line) => /^\| `[^`]+` \|/.test(line))
    .map((line) => {
      const [id, title, verdict, lacked] = line.split('|').slice(1, -1).map((cell) => cell.trim());
      return { id: id.replace(/`/g, ''), title, verdict, lacked };
    });
}

describe('docs/card-audit.md', () => {
  it('has one row for every idea of the ladder, in ladder order, and no other', () => {
    expect(rows().map((r) => r.id)).toEqual(LADDER.map((i) => i.id));
  });

  it('gives each row the idea title, a verdict and what a beginner lacked', () => {
    for (const row of rows()) {
      expect(row.title, row.id).toBe(LADDER.find((i) => i.id === row.id)?.title);
      expect(VERDICTS, row.id).toContain(row.verdict);
      expect(row.lacked.length, row.id).toBeGreaterThan(3);
    }
  });

  it('has one row for every idea of the Hebrew ladder, judged, and no other', () => {
    expect(rows('audit-hbo').map((r) => r.id)).toEqual(HEBREW_LADDER.map((i) => i.id));
    for (const row of rows('audit-hbo')) {
      expect(row.title, row.id).toBe(HEBREW_LADDER.find((i) => i.id === row.id)?.title);
      expect(VERDICTS, row.id).toContain(row.verdict);
      expect(row.lacked.length, row.id).toBeGreaterThan(3);
    }
  });
});
