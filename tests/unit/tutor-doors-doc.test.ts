// docs/tutor-doors.md (mw-5r3p30.1144) audits every in-page 'Ask the tutor' button: a new one, in a file the audit does not name, fails here until it is
// added to the table with its verdict. Help has none: the floating ? is the one door (tests/unit/help.test.tsx, tests/e2e/help.spec.ts).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : []));

describe('docs/tutor-doors.md', () => {
  const doc = readFileSync('docs/tutor-doors.md', 'utf8');
  const buttons = files('src').filter((f) => readFileSync(f, 'utf8').split('\n').some((line) => line.trim() === 'Ask the tutor'));

  it('names every file that draws an Ask the tutor button', () => {
    expect(buttons.length).toBeGreaterThan(0);
    for (const file of buttons) expect(doc, file).toContain(file);
  });

  it('records Help as removed', () => {
    expect(buttons).not.toContain('src/HelpScreen.tsx');
    expect(doc).toMatch(/Help[^\n]*\*\*Removed\*\*/);
  });
});
