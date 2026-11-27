// tests/unit/lxx-ship-jos-chapters.test.ts — the Joshua chapters one word each held back (story mw-u2w5klk.349.160).
// Joshua 1, 2, 3, 9 and 10 each had a single word with no answer on a host with no Morpheus cache: its choices row named a reading only Morpheus offers (πορεύω, a lemma the New Testament does not have,
// beside the deponent πορεύομαι the parser gives), and a choice outside the candidates that is not marked a guess is refused (choices.ts applyChoices), so the chapter was 'not shipped'.
// The rows now name a reading of the word's own candidates, or are marked a guess where the form's reading (an aorist passive imperative) is no candidate, so a host without the cache ships them as the Laptop does.
// Joshua 10-12, 14, 15, 20 and 21 (story mw-u2w5klk.349.195) were held, with the cache, by a Hebron or an Anon: a name no lexicon has is read by the cache as a nominative or a vocative alone, so its choice (a genitive, an accusative) was outside the candidates and refused; they are guesses now, and a describe below runs the ship with the cache.
// Needs the pinned raw sources alone (tests/support/lxx-real-data.ts lxxRawData) and runs the ship with --no-morpheus on Joshua alone; skipped with the gate's line when they are not on the disk.
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runShip, type Shipped } from '../../scripts/lxx/ship';
import { lxxRawData, lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRawData();
const HELD_BY_ONE_WORD = [1, 2, 3, 9, 10];

describe.skipIf(!real.run)('Joshua shipped with no Morpheus cache', () => {
  const dirs: string[] = [];
  const log: string[] = [];
  let shipped: Shipped;
  beforeAll(async () => {
    const out = mkdtempSync(join(tmpdir(), 'lampas-lxx-jos-ship-'));
    dirs.push(out);
    shipped = await runShip(['--out', out, '--no-morpheus'], { rawDir: real.rawDir, alignDir: '', books: [['Jos', 'Joshua']], log: (l) => log.push(l) });
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('ships chapters 1, 2, 3, 9 and 10, each held by one word before, and says of none of them that it is not shipped', () => {
    const jos = shipped.books.find((b) => b.code === 'jos')!;
    for (const n of HELD_BY_ONE_WORD) expect(jos.shipped, `Jos ${n}`).toContain(n);
    expect(log.filter((l) => /^jos: chapter (1|2|3|9|10) is not shipped/.test(l))).toEqual([]);
  });
});

const NAMES_HELD = [10, 11, 12, 14, 15, 20, 21];
const withCache = lxxRealData();
const cached = withCache.run && existsSync(join(withCache.morpheusDir, 'jos.tsv'));

describe.skipIf(!cached)('Joshua shipped with the Morpheus cache', () => {
  const dirs: string[] = [];
  const log: string[] = [];
  let shipped: Shipped;
  beforeAll(async () => {
    const out = mkdtempSync(join(tmpdir(), 'lampas-lxx-jos-ship-cache-'));
    dirs.push(out);
    shipped = await runShip(['--out', out], { rawDir: withCache.rawDir, morpheusDir: withCache.morpheusDir, alignDir: '', books: [['Jos', 'Joshua']], log: (l) => log.push(l) });
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('ships chapters 10, 11, 12, 14, 15, 20 and 21, each held by a Hebron or an Anon before, and names no chapter held by a pending word', () => {
    const jos = shipped.books.find((b) => b.code === 'jos')!;
    for (const n of NAMES_HELD) expect(jos.shipped, `Jos ${n}`).toContain(n);
    expect(log.filter((l) => /^jos: chapter \d+ is not shipped: pending/.test(l))).toEqual([]);
  });
});
