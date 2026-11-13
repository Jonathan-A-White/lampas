// @vitest-environment node
// tests/unit/layers.test.ts — a lower layer does not import a higher one, and the list of today's breaks can only get shorter (mw-6ww.175.12).
// Layers (eslint-rules/layers.js): data < shared (src/ui, src/services) < features (everything else). The rule is eslint-rules/no-layer-inversion.js.
import fs from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { INVERSIONS_RECORDED, inversionKey, layerOf, resolveImport } from '../../eslint-rules/layers.js';
import allowed from '../../eslint-rules/layer-inversions.json';

const ROOT = process.cwd();
const eslint = new ESLint({ cwd: ROOT });

const errors = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === 'local/no-layer-inversion');
};

describe('the layers', () => {
  it('put a file in its layer', () => {
    expect(layerOf('src/data/chapter.ts')).toBe('data');
    expect(layerOf('src/config.ts')).toBe('data');
    expect(layerOf('src/ui/focus.ts')).toBe('shared');
    expect(layerOf('src/services/talk.ts')).toBe('shared');
    expect(layerOf('src/WordSheet.tsx')).toBe('features');
    expect(layerOf('src/reader/ReaderMenu.tsx')).toBe('features');
    expect(layerOf('tests/unit/x.ts')).toBeNull();
  });

  it('call only an upward import an inversion', () => {
    expect(inversionKey('src/data/a.ts', 'src/WordSheet.tsx')).toBe('src/data/a.ts -> src/WordSheet.tsx');
    expect(inversionKey('src/ui/a.ts', 'src/AskTutor.tsx')).not.toBeNull();
    expect(inversionKey('src/data/a.ts', 'src/ui/focus.ts')).not.toBeNull();
    expect(inversionKey('src/AskTutor.tsx', 'src/data/a.ts')).toBeNull();
    expect(inversionKey('src/data/a.ts', 'src/data/b.ts')).toBeNull();
    expect(inversionKey('src/speech/a.ts', 'src/settings/b.ts')).toBeNull();
  });
});

describe('an import of a higher layer from a lower one', () => {
  it('from src/data into a screen is refused', async () => {
    const found = await errors("import { WordSheet } from '../WordSheet';\nexport const x = WordSheet;\n", 'src/data/newThing.ts');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('src/data/newThing.ts');
    expect(found[0].message).toContain('src/WordSheet.tsx');
    expect(found[0].message).toContain('may only get shorter');
  });

  it('from src/ui into a feature is refused', async () => {
    expect(await errors("import { AskTutor } from '../AskTutor';\nexport const x = AskTutor;\n", 'src/ui/newThing.tsx')).toHaveLength(1);
  });

  it('from src/services into the Reader is refused', async () => {
    expect(await errors("export { Reader } from '../Reader';\n", 'src/services/newThing.ts')).toHaveLength(1);
    expect(await errors("export const load = () => import('../Reader');\n", 'src/services/newThing.ts')).toHaveLength(1);
    expect(await errors("export type R = typeof import('../Reader');\n", 'src/services/newThing.ts')).toHaveLength(1);
  });

  it('from src/data into src/ui is refused (shared is above data)', async () => {
    expect(await errors("import { focusQuietly } from '../ui/focus';\nexport const x = focusQuietly;\n", 'src/data/newThing.ts')).toHaveLength(1);
  });

  it('downwards, sideways and into a package is fine', async () => {
    expect(await errors("import { loadChapter } from '../data/chapter';\nexport const x = loadChapter;\n", 'src/WordSheet.tsx')).toHaveLength(0);
    expect(await errors("import { loadChapter } from './chapter';\nexport const x = loadChapter;\n", 'src/data/newThing.ts')).toHaveLength(0);
    expect(await errors("import { useState } from 'react';\nexport const x = useState;\n", 'src/data/newThing.ts')).toHaveLength(0);
    expect(await errors("import { focusQuietly } from './focus';\nexport const x = focusQuietly;\n", 'src/ui/newThing.ts')).toHaveLength(0);
  });

  it('is not checked outside src/', async () => {
    expect(await errors("import { WordSheet } from '../../src/WordSheet';\nexport const x = WordSheet;\n", 'tests/unit/x.ts')).toHaveLength(0);
  });

  it('is refused when its pair is not on the list, and let through when it is', async () => {
    const [from, to] = (allowed as string[])[0].split(' -> ');
    const spec = path.relative(path.dirname(from), to).replace(/\.tsx?$/, '');
    const code = `import * as m from '${spec.startsWith('.') ? spec : './' + spec}';\nexport const x = m;\n`;
    expect(await errors(code, from)).toHaveLength(0);
    const other = path.join(path.dirname(from), 'someOtherFile.ts');
    expect(await errors(code, other)).toHaveLength(1);
  });
});

describe('the list of allowed inversions', () => {
  const list = allowed as string[];

  it(`is no longer than the ${INVERSIONS_RECORDED} this story recorded: it only gets shorter`, () => {
    expect(list.length, 'a new line in eslint-rules/layer-inversions.json is a new break of the layers: move what the file needs down instead').toBeLessThanOrEqual(INVERSIONS_RECORDED);
  });

  it('is sorted and has no repeat', () => {
    expect(list).toEqual([...new Set(list)].sort());
  });

  it('holds only lines that are still inversions: delete a line you removed and lower INVERSIONS_RECORDED to match', () => {
    const stale = list.filter((line) => {
      const [from, to] = line.split(' -> ');
      if (!fs.existsSync(path.join(ROOT, from)) || !fs.existsSync(path.join(ROOT, to))) return true;
      const source = fs.readFileSync(path.join(ROOT, from), 'utf8');
      const specs = [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"](\.[^'"]*)['"]/g)].map((m) => m[1]);
      return !specs.some((spec) => resolveImport(ROOT, from, spec) === to);
    });
    expect(stale).toEqual([]);
  });

  it('is as long as the count recorded, until a line is deleted', () => {
    // Deleting a line is the point: when it happens, lower INVERSIONS_RECORDED in eslint-rules/layers.js with it.
    expect(list.length).toBe(INVERSIONS_RECORDED);
  });
});
