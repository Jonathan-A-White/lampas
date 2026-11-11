// mw-lcv9z3g.19: a step file's afterAll closes the database through features/steps/close-database.ts (it waits for the usage log's queue first), never
// with db.close() itself: the App's background writes in flight at that moment logged a DatabaseClosedError into the run. This fails, naming the file,
// on an afterAll that still calls db.close() directly. (A close in the middle of a scenario, to reopen the store, is not an afterAll and is not read.)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const STEPS = 'features/steps';

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesUnder(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []));

/** Each afterAll( ... ) call of a file, up to the first line that starts at column 0 with a closing bracket (or the same line for a one-liner). */
const afterAlls = (source: string): string[] =>
  [...source.matchAll(/afterAll\(/g)].map((m) => {
    const rest = source.slice(m.index);
    const end = rest.search(/\n[)}]/);
    return end === -1 ? rest : rest.slice(0, end + 2);
  });

describe('a step file closes the database through closeDatabase', () => {
  const files = filesUnder(STEPS).filter((f) => !f.endsWith('close-database.ts'));

  it('reads the step files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no afterAll calls db.close() itself', () => {
    const offenders = files.filter((f) => afterAlls(readFileSync(f, 'utf8')).some((block) => /\bdb\.close\(\)/.test(block)));
    expect(offenders).toEqual([]);
  });

  it('every file whose afterAll closes the database imports closeDatabase', () => {
    const missing = files.filter((f) => {
      const source = readFileSync(f, 'utf8');
      return afterAlls(source).some((block) => /closeDatabase/.test(block)) && !/import \{ closeDatabase \} from '(\.\.?)\/(\.\.\/)?close-database'|from '\.\.?\/close-database'/.test(source);
    });
    expect(missing).toEqual([]);
  });
});
