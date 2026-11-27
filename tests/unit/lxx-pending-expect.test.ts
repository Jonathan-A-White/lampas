// story mw-u2w5klk.394: the batch table moves as the derivation's rules land (Daniel batch 2 was filed as chapters 3-4, 775 words, and is 4-6, 624), so a model story's
// range is only as old as its filing. `lxx:pending --chapters <a>-<b> [--words <n>]` is the story's range said to the command: it refuses, naming the table's row, when the cut differs.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPending } from '../../scripts/lxx/pending';
import type { DeriveInput } from '../../scripts/lxx/derive';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const [versification, words] = fixture('swete-gen-1.csv').split('\n\n');
const GEN_1: DeriveInput = { versification, words, tagnt: [fixture('tagnt-slice.tsv')], tbesg: fixture('tbesg-slice.txt') };
const tmp = (): string => mkdtempSync(join(tmpdir(), 'lxx-expect-'));
const run = (outDir: string, ...extra: string[]) => runPending(['--book', 'gen', '--batch', '1', '--no-morpheus', ...extra], { input: GEN_1, outDir });

describe('lxx:pending --chapters, the story’s range said to the command (story mw-u2w5klk.394)', () => {
  it('lists as before when the range and the count are the table’s', async () => {
    expect((await run(tmp(), '--chapters', '1', '--words', '168')).words).toHaveLength(168);
    expect((await run(tmp(), '--chapters', '1-1')).words).toHaveLength(168);
  });

  it('refuses a range that is not the table’s, names the table’s row, and writes no listing', async () => {
    const outDir = tmp();
    const error = await run(outDir, '--chapters', '1-2').then(
      () => '',
      (e: Error) => e.message,
    );
    expect(error).toMatch(/gen batch 1 is chapter 1 \(168 pending words\), not chapters 1-2/);
    expect(error).toMatch(/lxx:batches -- --book gen/);
    expect(existsSync(join(outDir, 'pending', 'gen-01.md'))).toBe(false);
  });

  it('refuses a count that is not the table’s', async () => {
    await expect(run(tmp(), '--chapters', '1', '--words', '934')).rejects.toThrow(/gen batch 1 is chapter 1 \(168 pending words\), not chapter 1 \(934 pending words\)/);
    await expect(run(tmp(), '--words', '934')).rejects.toThrow(/168 pending words/);
  });

  it('refuses a range it cannot read', async () => {
    await expect(run(tmp(), '--chapters', 'one')).rejects.toThrow(/usage/);
    await expect(run(tmp(), '--chapters', '3-1')).rejects.toThrow(/usage/);
  });
});
