// @vitest-environment node
// tests/unit/no-raw-interest-write.test.ts — lint refuses a raw greekInterest / hebrewInterest write in an e2e or a feature step (mw-fnvjof.17.74).
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });
const SPEC = 'tests/e2e/x.spec.ts';
const STEPS = 'features/steps/x.steps.tsx';

const errors = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === 'local/no-raw-interest-write');
};
const body = (line: string) => `export async function t(page: unknown, db: any, keep: any) {\n  ${line}\n}\n`;

const WRITES: [string, string][] = [
  ['keep(page, name, value)', "await keep(page, 'greekInterest', '2');"],
  ['a row with key', "await db.settings.put({ key: 'hebrewInterest', value: '5' });"],
  ['a property of an object', "const saved = { greekInterest: '5', readerView: 'greek' };"],
  ['a quoted property', "const saved = { 'hebrewInterest': '5' };"],
  ['bulkPut', "await db.settings.bulkPut([{ key: 'greekInterest', value: '0' }]);"],
];
const REASON = '// a raw level: the test is of a phone the dial never placed';

describe('a raw dial write in a test', () => {
  for (const [name, line] of WRITES) {
    for (const file of [SPEC, STEPS]) {
      it(`${name} is one error in ${file}`, async () => {
        const found = await errors(body(line), file);
        expect(found).toHaveLength(1);
        expect(found[0].message).toContain('putAtLevels');
        expect(found[0].message).toContain('// a raw level:');
      });
    }
    it(`${name} passes with the mark on its line`, async () => {
      expect(await errors(body(`${line} ${REASON}`), SPEC)).toHaveLength(0);
    });
    it(`${name} passes with the mark on the line above`, async () => {
      expect(await errors(body(`${REASON}\n  ${line}`), STEPS)).toHaveLength(0);
    });
  }

  it('a read of the dial, the localStorage start key and the setting row are not writes', async () => {
    const reads = [
      "const row = await db.settings.get('hebrewInterest');",
      "window.localStorage.setItem('lampas.greekInterestStart', '5');",
      "const r = page.locator('[data-setting=\"greekInterest\"]');",
    ];
    for (const line of reads) expect(await errors(body(line), SPEC), line).toHaveLength(0);
  });

  it('is not applied outside e2e and the feature steps', async () => {
    expect(await errors(body("await keep(page, 'greekInterest', '2');"), 'tests/unit/x.test.ts')).toHaveLength(0);
  });
});
