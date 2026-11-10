// scripts/offline-sizes.ts — npm run offline:sizes [-- <build dir> [<data-lxx dir>]] (story mw-lcv9z3g.6; src/data/offlineSizes.ts, docs/data.md 'The offline copy').
// Measures, over a real build, the bytes each scope of the offline copy fetches (the files offlineUrls names, read from the build dir) and compares them with the megabytes the Keep on this phone chips show.
// Exits 1 when a chip is more than 10% off. Defaults: the build dir `dist` (after `npm run build` and `npm run lxx:ship -- --out dist/data-lxx`) and its `data-lxx`. `public` measures the committed data alone
// (the Septuagint is then not measured: public/data-lxx ships no chapter, so its line says so). The Septuagint grows as books are added, so run this after each ship: its chip is an estimate (lxxBytes).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LxxIndex } from '../src/data/lxxChapter';
import { offlineUrls, type OfflineScope } from '../src/data/offlineCopy';
import { scopeBytes } from '../src/data/offlineSizes';
import { megabytes } from '../src/settings/offlineCopyState';

/** How far a chip's megabytes may be from the bytes really fetched. */
export const TOLERANCE = 0.1;

export interface Measure {
  scope: OfflineScope;
  /** the megabytes the chip shows, in bytes (what is read on the screen, rounded as it is) */
  shown: number;
  /** the bytes of the files the scope fetches */
  real: number;
  /** files named but absent from the build dir */
  missing: string[];
  ok: boolean;
}

const SCOPES: OfflineScope[] = ['hbo', 'lxx', 'nt', 'all'];

/** The Septuagint's index in `lxxDir`, or null when the build has none (or ships no chapter). */
export function readLxxIndex(lxxDir: string): LxxIndex | null {
  const file = join(lxxDir, 'index.json');
  if (!existsSync(file)) return null;
  const index = JSON.parse(readFileSync(file, 'utf8')) as LxxIndex;
  return index.books.length > 0 ? index : null;
}

/** What each scope really fetches in the build at `root` against its chip. A scope that keeps the Septuagint is left out when the build ships none. */
export function measure(root: string, lxxDir: string = join(root, 'data-lxx')): Measure[] {
  const lxx = readLxxIndex(lxxDir);
  const out: Measure[] = [];
  for (const scope of SCOPES) {
    if (!lxx && (scope === 'lxx' || scope === 'all')) continue;
    const missing: string[] = [];
    let real = 0;
    for (const url of offlineUrls(scope, undefined, undefined, lxx)) {
      const path = url.split('?')[0];
      const file = path.startsWith('/data-lxx/') ? join(lxxDir, path.slice('/data-lxx/'.length)) : join(root, path);
      if (existsSync(file)) real += statSync(file).size;
      else missing.push(url);
    }
    const shown = Number(megabytes(scopeBytes(scope, lxx) ?? 0).replace(' MB', '')) * 1e6;
    out.push({ scope, shown, real, missing, ok: missing.length === 0 && Math.abs(shown - real) <= TOLERANCE * real });
  }
  return out;
}

function main(argv: readonly string[]): number {
  const root = resolve(argv[0] ?? 'dist');
  const lxxDir = resolve(argv[1] ?? join(root, 'data-lxx'));
  const rows = measure(root, lxxDir);
  if (!readLxxIndex(lxxDir)) console.log(`no Septuagint chapter in ${lxxDir}: its chip and All's are not measured (run npm run lxx:ship -- --out <dir>/data-lxx first)`);
  for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'OFF '} ${r.scope.padEnd(4)} chip ${(r.shown / 1e6).toFixed(1).padStart(6)} MB   real ${(r.real / 1e6).toFixed(2).padStart(7)} MB   ${(((r.shown - r.real) / r.real) * 100).toFixed(1).padStart(5)}%${r.missing.length ? `   ${r.missing.length} files missing, e.g. ${r.missing[0]}` : ''}`);
  return rows.every((r) => r.ok) ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
