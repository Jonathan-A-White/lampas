// npm run lxx:morpheus-check -- --all (scripts/lxx/morpheus-check.ts buildAll; story mw-u2w5klk.381): one command builds the Morpheus cache for every book that lacks one, resumably,
// and reports a cache for each. Morpheus is the sample file's fake engine (as tests/unit/lxx-morpheus.test.ts); never Docker, never the network.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { DeriveInput } from '../../scripts/lxx/derive';
import { toBeta, type MorpheusEngine } from '../../scripts/lxx/morpheus';
import { allLines, buildAll } from '../../scripts/lxx/morpheus-check';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const FIXTURES = 'tests/fixtures/lxx';
const tagnt = [readFileSync(join(FIXTURES, 'tagnt-slice.tsv'), 'utf8')];
const tbesg = readFileSync(join(FIXTURES, 'tbesg-slice.txt'), 'utf8');
const input = (() => {
  const [gv, gw] = readFileSync(join(FIXTURES, 'swete-gen-1.csv'), 'utf8').split('\n\n');
  const [pv, pw] = readFileSync(join(FIXTURES, 'swete-psa-22.csv'), 'utf8').split('\n\n');
  // the two fixtures' versification rows and word rows side by side, the way the real file holds every book
  const [vHead, ...vRows] = gv.split('\n');
  const [wHead, ...wRows] = gw.split('\n');
  return { versification: [vHead, ...vRows, ...pv.split('\n').slice(1)].join('\n'), words: [wHead, ...wRows, ...pw.split('\n').slice(1)].join('\n'), tagnt, tbesg } satisfies DeriveInput;
})();

const SAMPLE = new Map(
  readFileSync(join(FIXTURES, 'morpheus-sample.tsv'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l): [string, string] => {
      const [form, segments = ''] = l.split('\t');
      return [toBeta(form.normalize('NFC'))!, segments.replaceAll('⇥', '\t')];
    }),
);
const engine = (calls: string[][] = [], why?: string): MorpheusEngine => ({
  unavailable: () => why,
  crunch(forms) {
    calls.push([...forms]);
    return forms.map((f) => (SAMPLE.get(f) ? `${f}\n${SAMPLE.get(f)}\n` : '')).join('');
  },
});

const dirs: string[] = [];
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'lxx-all-'));
  dirs.push(d);
  return d;
};
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

describe('lxx:morpheus-check --all', () => {
  it('builds the cache of every book that has none, with the wall time of each, and says so', () => {
    const out = tmp();
    let t = 0;
    const rows = buildAll(input, out, engine(), () => {}, ['gen', 'psa'], () => (t += 1500));
    expect(rows.map((r) => r.book)).toEqual(['gen', 'psa']);
    for (const r of rows) {
      expect(existsSync(join(out, 'morpheus', `${r.book}.tsv`)), r.book).toBe(true);
      expect(r.status).toBe('built');
      expect(r.ms).toBe(1500);
    }
    const text = allLines(rows).join('\n');
    expect(text).toMatch(/gen\s+built.*1\.5 s/);
    expect(text).toMatch(/2 of 2 books have a Morpheus cache; built in this run: gen, psa/);
  });

  it('is resumable: a second run asks Morpheus nothing and reports the caches as there', () => {
    const out = tmp();
    buildAll(input, out, engine(), () => {}, ['gen', 'psa']);
    const calls: string[][] = [];
    const rows = buildAll(input, out, engine(calls), () => {}, ['gen', 'psa']);
    expect(calls).toEqual([]);
    expect(rows.map((r) => r.status)).toEqual(['cache there', 'cache there']);
    expect(allLines(rows).join('\n')).toMatch(/2 of 2 books have a Morpheus cache; built in this run: none/);
  });

  it('builds only the books lacking one when the others are there', () => {
    const out = tmp();
    buildAll(input, out, engine(), () => {}, ['gen']);
    const rows = buildAll(input, out, engine(), () => {}, ['gen', 'psa']);
    expect(rows.map((r) => `${r.book} ${r.status}`)).toEqual(['gen cache there', 'psa built']);
  });

  it('without Docker, reports each book without a cache and counts it short', () => {
    const out = tmp();
    const rows = buildAll(input, out, engine([], 'docker is not in PATH'), () => {}, ['gen', 'psa']);
    expect(rows.map((r) => r.status)).toEqual(['no cache', 'no cache']);
    expect(allLines(rows).join('\n')).toMatch(/0 of 2 books have a Morpheus cache; without: gen, psa/);
  });
});
