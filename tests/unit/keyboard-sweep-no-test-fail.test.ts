// tests/unit/keyboard-sweep-no-test-fail.test.ts — mw-5r3p30.1016: Playwright's list reporter prints a test.fail() test that fails as expected with a red ✘ line, and mw suite
// reads every ✘ line of a whole run as a failing test (application/gatelog.go), so the sweep's two open findings were reported as a flaky file every night while the file passed alone.
// An open finding is therefore a test that passes while the fault stands and goes red when it is mended, never a test.fail().
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const spec = readFileSync('tests/e2e/keyboard-typing-sweep.spec.ts', 'utf8');

describe('tests/e2e/keyboard-typing-sweep.spec.ts', () => {
  it('does not call test.fail(): an expected failure prints a ✘ line that mw suite counts as a failure', () => {
    const code = spec.split('\n').filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/**'));
    expect(code.filter((line) => /\btest\.fail\(/.test(line))).toEqual([]);
  });
});
