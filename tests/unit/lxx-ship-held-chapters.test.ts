// tests/unit/lxx-ship-held-chapters.test.ts — Deuteronomy 15 and 31, Hosea 4 and Micah 4, each held back by one to three refused choices (story mw-u2w5klk.349.199).
// With the Morpheus cache a verb's candidates are the cache's readings, and the cache gives a deponent's present middle and passive (V-PMM, V-PPM) but no 'N' voice: a choices row naming V-PNP-DSM ἐπιδέω (Deu 15:9, 15:11),
// V-PNM-2S ἀνδρίζω (Deu 31:6, 31:7, 31:23, Mic 4:10) or V-PPM-2P εἰσπορεύω (Hos 4:15) was outside the candidates and not marked a guess, so applyChoices refused it and the chapter was 'not shipped: pending'.
// The rows now name the cache's own reading of each word (the middle, which is the sense of ἐπιδέομαι and ἀνδρίζομαι; εἰσπορεύομαι's imperative V-PNM-2P).
// Runs the ship with the Morpheus cache on the three books; skipped with the gate's line when the cache is not on the disk (tests/support/lxx-real-data.ts).
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runShip, type Shipped } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const cached = real.run && ['deu', 'hos', 'mic'].every((code) => existsSync(join(real.morpheusDir, `${code}.tsv`)));

describe.skipIf(!cached)('Deuteronomy, Hosea and Micah shipped with the Morpheus cache', () => {
  const dirs: string[] = [];
  const log: string[] = [];
  let shipped: Shipped;
  beforeAll(async () => {
    const out = mkdtempSync(join(tmpdir(), 'lampas-lxx-held-ship-'));
    dirs.push(out);
    shipped = await runShip(['--out', out], {
      rawDir: real.rawDir,
      morpheusDir: real.morpheusDir,
      alignDir: '',
      books: [['Deu', 'Deuteronomy'], ['Hos', 'Hosea'], ['Mic', 'Micah']],
      log: (l) => log.push(l),
    });
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  const book = (code: string) => shipped.books.find((b) => b.code === code)!;

  it('ships Deuteronomy 15 and 31, and all 34 chapters', () => {
    expect(book('deu').shipped).toContain(15);
    expect(book('deu').shipped).toContain(31);
    expect(book('deu').shipped).toHaveLength(34);
  });

  it('ships Hosea 4 and all 7 chapters of Micah', () => {
    expect(book('hos').shipped).toContain(4);
    expect(book('mic').shipped).toHaveLength(7);
  });

  it('names no chapter of the three books as held by a pending word', () => {
    expect(log.filter((l) => /^(deu|hos|mic): chapter (15|31|4) is not shipped/.test(l))).toEqual([]);
  });
});
