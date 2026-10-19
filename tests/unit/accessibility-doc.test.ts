// The axe rules the accessibility check leaves out (mw-cwf538.2) are never silent: each id in tests/support/axe-excluded.ts has an entry in
// docs/accessibility.md under 'Rules left out of the check', and each entry there is still excluded.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXCLUDED_RULES } from '../support/axe-excluded';

const doc = readFileSync('docs/accessibility.md', 'utf8');
const section = doc.split('## Rules left out of the check')[1] ?? '';
const listed = [...section.matchAll(/^- `([a-z0-9-]+)`: (.+)$/gm)].map((m) => ({ id: m[1], reason: m[2] }));

describe('the rules the accessibility check leaves out', () => {
  it('each has its reason in docs/accessibility.md', () => {
    for (const id of EXCLUDED_RULES) {
      const entry = listed.find((l) => l.id === id);
      expect(entry, `${id} is excluded in tests/support/axe-excluded.ts but docs/accessibility.md lists no reason for it`).toBeDefined();
      expect(entry?.reason.length, `${id} needs a reason`).toBeGreaterThan(20);
    }
  });
  it('are all still excluded: the doc lists no rule the spec checks', () => {
    expect(listed.map((l) => l.id).sort()).toEqual([...EXCLUDED_RULES].sort());
  });
});
