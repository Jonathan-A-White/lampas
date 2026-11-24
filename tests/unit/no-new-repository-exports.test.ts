// @vitest-environment node
// tests/unit/no-new-repository-exports.test.ts — the repositories barrel is frozen: no new export, the ones it has pass (mw-6ww.175.84).
import fs from 'node:fs';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import allowed from '../../eslint-rules/repository-exports.json';

const BARREL = 'src/data/repositories/index.ts';
const eslint = new ESLint({ cwd: process.cwd() });

const errors = async (code: string, filePath = BARREL) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === 'local/no-new-repository-exports');
};

describe('the repositories barrel', () => {
  it('passes as it is today', async () => {
    expect(await errors(fs.readFileSync(BARREL, 'utf8'))).toEqual([]);
  });

  it('refuses a new export line', async () => {
    const found = await errors("export { brandNew } from './brandNew';\n");
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('./brandNew#brandNew');
    expect(found[0].message).toContain('may only get shorter');
  });

  it('refuses a new name added to an existing line', async () => {
    expect(await errors("export { addAnswer, brandNew } from './answers';\n")).toHaveLength(1);
  });

  it('refuses a new type export, a star export, a local export and a default export', async () => {
    expect(await errors("export type { Fresh } from './words';\n")).toHaveLength(1);
    expect(await errors("export * from './fresh';\n")).toHaveLength(1);
    expect(await errors('export const fresh = 1;\nexport function again() {}\n')).toHaveLength(2);
    expect(await errors('const x = 1;\nexport default x;\n')).toHaveLength(1);
  });

  it('allows an existing export on a new line, and leaves other files alone', async () => {
    expect(await errors("export { addAnswer } from './answers';\n")).toEqual([]);
    expect(await errors("export { brandNew } from './brandNew';\n", 'src/data/repositories/other.ts')).toEqual([]);
  });

  it('lists only what the barrel still exports', () => {
    const src = fs.readFileSync(BARREL, 'utf8');
    const names = allowed.map((k) => k.split('#')[1]);
    for (const n of names) expect(src, `${n} is no longer exported: drop it from eslint-rules/repository-exports.json`).toContain(n);
  });
});
