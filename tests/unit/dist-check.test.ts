// tests/unit/dist-check.test.ts — `npm run dist:check` (scripts/dist-check.ts, mw-fnvjof.17.351): what a deploy looks at in dist before it replaces the live site.
// The incident (mw-fnvjof.17.350): `npm run build` alone copies public/data-lxx, whose index.json has `books: []` by design, so live lost its Septuagint.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDist, readDist, type DistState } from '../../scripts/dist-check';

const whole: DistState = {
  indexHtml: true,
  lxxIndex: JSON.stringify({ sources: {}, books: [{ code: 'gen', shipped: [1, 2] }, { code: 'psa', shipped: [3] }] }),
  lxxFiles: ['gen/1.json', 'gen/2.json', 'psa/3.json', 'index.json'],
  choices: ['gen-01.tsv', 'psa-01.tsv'],
};

describe('checkDist', () => {
  it('passes a whole dist', () => {
    expect(checkDist(whole)).toEqual([]);
  });

  it('names that no book is shipped when the index has none beside a choices file', () => {
    const faults = checkDist({ ...whole, lxxIndex: JSON.stringify({ sources: {}, books: [] }), lxxFiles: ['index.json'], choices: ['gen-01.tsv'] });
    expect(faults).toHaveLength(1);
    expect(faults[0]).toMatch(/^dist:check: .*no book is shipped/);
  });

  it('names a missing or unreadable index when there are choices', () => {
    expect(checkDist({ ...whole, lxxIndex: null })[0]).toMatch(/^dist:check: .*data-lxx\/index\.json/);
    expect(checkDist({ ...whole, lxxIndex: 'not json' })[0]).toMatch(/^dist:check: .*data-lxx\/index\.json/);
  });

  it('lets an empty index stand when the repo has no choices file', () => {
    expect(checkDist({ ...whole, lxxIndex: JSON.stringify({ books: [] }), lxxFiles: [], choices: [] })).toEqual([]);
  });

  it('names a book the index lists with no chapter file', () => {
    const faults = checkDist({ ...whole, lxxFiles: ['gen/1.json', 'gen/2.json', 'index.json'] });
    expect(faults).toHaveLength(1);
    expect(faults[0]).toMatch(/^dist:check: .*psa/);
  });

  it('names a shipped chapter whose file is missing', () => {
    const faults = checkDist({ ...whole, lxxFiles: ['gen/1.json', 'psa/3.json', 'index.json'] });
    expect(faults).toHaveLength(1);
    expect(faults[0]).toMatch(/^dist:check: .*gen.*2/);
  });

  it('names a missing dist/index.html', () => {
    const faults = checkDist({ ...whole, indexHtml: false });
    expect(faults).toHaveLength(1);
    expect(faults[0]).toMatch(/^dist:check: .*index\.html/);
  });

  it('gives one line a fault, each beginning dist:check:', () => {
    const faults = checkDist({ indexHtml: false, lxxIndex: JSON.stringify({ books: [] }), lxxFiles: [], choices: ['gen-01.tsv'] });
    expect(faults).toHaveLength(2);
    for (const f of faults) expect(f).toMatch(/^dist:check: [^\n]+$/);
  });
});

describe('readDist', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it('reads a dist folder and a choices folder as the check wants them', () => {
    const root = mkdtempSync(join(tmpdir(), 'lampas-dist-check-'));
    dirs.push(root);
    const dist = join(root, 'dist');
    const choices = join(root, 'choices');
    mkdirSync(join(dist, 'data-lxx', 'gen'), { recursive: true });
    mkdirSync(choices);
    writeFileSync(join(dist, 'index.html'), '<html></html>');
    writeFileSync(join(dist, 'data-lxx', 'index.json'), '{"books":[]}');
    writeFileSync(join(dist, 'data-lxx', 'gen', '1.json'), '{}');
    writeFileSync(join(choices, 'gen-01.tsv'), '');
    writeFileSync(join(choices, 'README.md'), '');
    const state = readDist(dist, choices);
    expect(state.indexHtml).toBe(true);
    expect(state.lxxIndex).toBe('{"books":[]}');
    expect([...state.lxxFiles].sort()).toEqual(['gen/1.json', 'index.json']);
    expect(state.choices).toEqual(['gen-01.tsv']);
  });

  it('reads a dist with nothing in it as nothing', () => {
    const root = mkdtempSync(join(tmpdir(), 'lampas-dist-check-'));
    dirs.push(root);
    expect(readDist(join(root, 'dist'), join(root, 'choices'))).toEqual({ indexHtml: false, lxxIndex: null, lxxFiles: [], choices: [] });
  });
});
