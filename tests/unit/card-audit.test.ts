// tests/unit/card-audit.test.ts — docs/card-audit.md (mw-5r3p30.234) judges every card of the grammar ladder for a total beginner: one row per
// LADDER idea, with its verdict on the card as it was and what a beginner lacked on it, so no card is skipped and none is listed that the ladder has not.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LADDER } from '../../src/data/grammar/ladder';

const VERDICTS = ['teaches a beginner', 'only reminds someone who knows'];

/** The table rows of the audit: | id | title | verdict | what a beginner lacked | */
function rows(): { id: string; title: string; verdict: string; lacked: string }[] {
  const doc = readFileSync('docs/card-audit.md', 'utf8');
  return doc
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
});
