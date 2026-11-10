// tests/support/lxx-real-data.ts: when the gate runs the Septuagint tests that read the real, git-ignored sources, and the one line it prints (story mw-cv2w9um).
import { describe, expect, it } from 'vitest';
import { decideLxxRealData, type LxxProbe, WATCHED } from '../support/lxx-real-data';
import { readFileSync } from 'node:fs';

const SRC = '/laptop/lampas';
const CWD = '/work/tree';
const sourcesIn = (root: string): string[] => [`${root}/data/raw/lxx`, `${root}/data/lxx/morpheus/gen.tsv`];

const probe = (over: { have?: string[]; links?: string[]; changed?: string[] | null; env?: Record<string, string>; cwd?: string } = {}): LxxProbe => {
  const have = new Set(over.have ?? []);
  const links = new Set(over.links ?? []);
  return { cwd: over.cwd ?? CWD, source: SRC, env: over.env ?? {}, exists: (p) => have.has(p), isLink: (p) => links.has(p), changed: () => (over.changed === undefined ? [] : over.changed) };
};

describe('the real-data Septuagint tests in the gate', () => {
  it('skips with one line, and does not refuse, where the sources are nowhere', () => {
    const r = decideLxxRealData(probe({ changed: ['scripts/lxx/align.ts'] }));
    expect(r.run).toBe(false);
    expect(r.line).toMatch(/SKIPPED/);
    expect(r.line).not.toContain('\n');
  });

  it('runs on the Laptop checkout\'s sources, with no symlink, when the work touches scripts/lxx/ or the choices', () => {
    for (const file of ['scripts/lxx/align.ts', 'data/lxx/choices/gen-01.tsv', 'data/lxx/align/gen-01.tsv']) {
      const r = decideLxxRealData(probe({ have: sourcesIn(SRC), changed: ['README.md', file] }));
      expect(r.run, file).toBe(true);
      expect(r.rawDir).toBe(`${SRC}/data/raw/lxx`);
      expect(r.morpheusDir).toBe(`${SRC}/data/lxx/morpheus`);
      expect(r.line).toMatch(/RUN/);
    }
  });

  it('skips borrowed sources, with one line, when the work touches none of what they check: a leftover link fails no gate', () => {
    const lent = decideLxxRealData(probe({ have: sourcesIn(SRC), changed: ['src/App.tsx'] }));
    expect(lent.run).toBe(false);
    expect(lent.line).toMatch(/SKIPPED.*borrowed/);
    const linked = decideLxxRealData(probe({ have: sourcesIn(CWD), links: [`${CWD}/data/raw`, `${CWD}/data/lxx/morpheus`], changed: ['src/App.tsx'] }));
    expect(linked.run).toBe(false);
    expect(linked.line).toMatch(/SKIPPED/);
    const linkedTouching = decideLxxRealData(probe({ have: sourcesIn(CWD), links: [`${CWD}/data/raw`], changed: ['scripts/lxx/ship.ts'] }));
    expect(linkedTouching.run).toBe(true);
    expect(linkedTouching.rawDir).toBe(`${CWD}/data/raw/lxx`);
  });

  it('always runs on a checkout\'s own real directories (the Laptop\'s main checkout), whatever the diff', () => {
    const r = decideLxxRealData(probe({ cwd: SRC, have: sourcesIn(SRC), changed: [] }));
    expect(r.run).toBe(true);
    expect(r.line).toMatch(/RUN/);
  });

  it('runs when git cannot say what changed, and obeys LAMPAS_LXX_REAL', () => {
    expect(decideLxxRealData(probe({ have: sourcesIn(SRC), changed: null })).run).toBe(true);
    expect(decideLxxRealData(probe({ have: sourcesIn(SRC), changed: [], env: { LAMPAS_LXX_REAL: 'run' } })).run).toBe(true);
    expect(decideLxxRealData(probe({ cwd: SRC, have: sourcesIn(SRC), env: { LAMPAS_LXX_REAL: 'skip' } })).run).toBe(false);
    expect(decideLxxRealData(probe({ env: { LAMPAS_LXX_REAL: 'run' } })).run).toBe(false);
  });

  it('watches the paths the real-data describe depends on, and the test reads its directories from the decision, not a bare existsSync', () => {
    expect(WATCHED).toEqual(expect.arrayContaining(['scripts/lxx/', 'data/lxx/choices/']));
    const test = readFileSync('tests/unit/lxx-align-choose.test.ts', 'utf8');
    expect(test).toContain('lxxRealData()');
    expect(test).not.toMatch(/existsSync\('data\/raw\/lxx'\)/);
  });
});
