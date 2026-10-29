// The gate runs `vitest related <changed files>` ([related_tests] in millwright's config), which selects the tests that import a changed file.
// Tests read grinds/ by path, which is no import, so a grinds edit over a ceiling selected no test and landed (mw-5r3p30.860). This runs the
// gate's own command for one grinds file of each kind and wants the test that pins that file among those selected.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);

/** The test files `vitest related <file>` selects, run with a name filter no test has, so nothing but the import is paid for. */
const selected = async (file: string): Promise<string[]> => {
  const { stdout } = await run(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'related', '--run', '--passWithNoTests', '--reporter=json', '--testNamePattern=^no test is named this$', file],
    { env: { ...process.env, TZ: 'UTC' }, maxBuffer: 64 * 1024 * 1024 },
  ).catch((e: { stdout?: string }) => ({ stdout: e.stdout ?? '' }));
  const json = stdout.slice(stdout.indexOf('{'));
  if (!json.startsWith('{')) return [];
  return (JSON.parse(json) as { testResults: { name: string }[] }).testResults.map((r) => r.name.replace(/^.*\/(tests|features)\//, '$1/'));
};

// One run of the gate's command for each of these (about ten seconds each, so they run together): what each grinds file must select.
const PINNED: Record<string, string[]> = {
  'grinds/bible-talk.instructions/340-how-to-answer.md': ['tests/unit/bible-talk-grind.test.ts', 'tests/unit/grind-instructions-size.test.ts', 'tests/unit/grind-parts.test.ts'],
  'grinds/bible-talk.answer.schema.json': ['tests/unit/bible-talk-grind.test.ts', 'tests/unit/answer-schema-no-empty-arrays.test.ts'],
  'grinds/tips.instructions.md': ['tests/unit/grind-instructions-size.test.ts'],
  'grinds/examples/bible-talk/cleaned-question.json': ['tests/unit/grind-examples.test.ts', 'tests/unit/bible-talk-grind.test.ts'],
};

describe('vitest related for a grinds file', () => {
  const runs = new Map<string, Promise<string[]>>();
  beforeAll(() => {
    for (const file of Object.keys(PINNED)) runs.set(file, selected(file));
  });

  it.each(Object.entries(PINNED))('%s selects the tests that pin it', async (grindsFile, tests) => {
    expect(await runs.get(grindsFile)).toEqual(expect.arrayContaining(tests));
  }, 240_000);
});
