// tests/unit/read-as-wait.test.ts — a step reads the Read as row only through a wait (mw-qtu3zvz.151).
// The row's sets and the set in force are two reads that land in two draws, so a step that reads the buttons and then the chosen one the
// instant the row appears can see the first draw's buttons with the second draw's pressed state (mw-qtu3zvz.92 found it twice).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILE = 'features/steps/variants-setting.steps.tsx';

describe('the variants-setting steps', () => {
  it("never read the Read as row's buttons or its chosen one outside a waitFor", () => {
    const rows = readFileSync(FILE, 'utf8').split('\n');
    const offences: string[] = [];
    rows.forEach((line, i) => {
      if (!/expect\(await (buttons|chosenIn)\('Read as'\)\)/.test(line)) return;
      if (!/waitFor/.test(line) && !/waitFor/.test(rows[i - 1] ?? '')) offences.push(`${FILE}:${i + 1} reads Read as at once: ${line.trim()}`);
    });
    expect(offences).toEqual([]);
  });
});
