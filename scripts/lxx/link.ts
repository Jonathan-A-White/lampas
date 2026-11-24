// scripts/lxx/link.ts — npm run lxx:link [-- --unlink]
// A fresh worktree on the Laptop lacks two git-ignored directories the Septuagint scripts read: data/raw (the pinned source downloads) and data/lxx/morpheus
// (the Morpheus cache). This symlinks both from the Laptop's checkout, /home/jwhite/lampas (docs/lxx-derivation.md 'A model session', step 0; story mw-u2w5klk.288).
// Idempotent; where that checkout is not there (cloud1, cloud2) or is the cwd, it makes no link, prints one line and exits 0. --unlink removes only the
// symlinks that point into that checkout, never a real directory.
// `--from <archive> [--store <dir>]` (story mw-u2w5klk.381) is for a host with no such checkout: the archive `npm run lxx:pack` made on the Laptop is unpacked into a store
// (default ~/.lampas-lxx-sources), every file checked against its sha256 manifest (a mismatch exits non-zero naming the file, and nothing is installed), and the worktree
// is linked to the store exactly as it is to the checkout.
import { existsSync, lstatSync, mkdirSync, readlinkSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installArchive } from './archive';

/** The Laptop's checkout, where the git-ignored data lives. */
export const SOURCE_CHECKOUT = '/home/jwhite/lampas';

/** The git-ignored directories a worktree borrows, relative to the repo root. */
export const LINKS = ['data/raw', 'data/lxx/morpheus'] as const;

/** Where an archive is unpacked on a host without the Laptop's checkout. */
export const DEFAULT_STORE = join(homedir(), '.lampas-lxx-sources');

export interface LinkOptions {
  cwd: string;
  /** the checkout to link from (tests give a temp dir) */
  source: string;
  log: (line: string) => void;
  /** where `--from` unpacks an archive; default DEFAULT_STORE (tests give a temp dir) */
  store?: string;
}

/** lstat that says null for a path that is not there (existsSync follows a dangling link). */
function lstatOrNull(path: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

const realOrNull = (path: string): string | null => {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
};

/** Returns the exit code. */
export function runLink(argv: readonly string[], opts: LinkOptions): number {
  const { log } = opts;
  let archive: string | undefined;
  let storeArg: string | undefined;
  const unknown: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--unlink') continue;
    if (argv[i] === '--from' || argv[i] === '--store') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        log(`lxx:link: ${argv[i]} needs a value (${argv[i] === '--from' ? 'the archive npm run lxx:pack made' : 'a directory'})`);
        return 1;
      }
      if (argv[i] === '--from') archive = value;
      else storeArg = value;
      i++;
      continue;
    }
    unknown.push(argv[i]);
  }
  if (unknown.length > 0) {
    log(`lxx:link: unknown argument ${unknown.join(' ')}; the options are --unlink, --from <archive> and --store <dir>`);
    return 1;
  }
  const unlink = argv.includes('--unlink');
  const cwd = resolve(opts.cwd);
  let source = resolve(opts.source);

  if (archive !== undefined) {
    if (unlink) {
      log('lxx:link: --from and --unlink do not go together');
      return 1;
    }
    const store = resolve(storeArg ?? opts.store ?? DEFAULT_STORE);
    const result = installArchive(resolve(archive), store, log);
    if (!result.ok) {
      log(`lxx:link: ${archive} did not verify; nothing was installed or linked:`);
      for (const problem of result.problems) log(`  ${problem}`);
      return 1;
    }
    if (!result.held) log(`verified ${result.files} files against the manifest`);
    source = store;
  }

  if (archive === undefined && !existsSync(source)) {
    log(`lxx:link: no source checkout at ${source}; nothing to link (this host builds its own data).`);
    return 0;
  }
  if (realOrNull(cwd) === realOrNull(source)) {
    log(`lxx:link: ${cwd} is the source checkout; nothing to link.`);
    return 0;
  }

  let changed = 0;
  for (const rel of LINKS) {
    const here = join(cwd, rel);
    const from = join(source, rel);
    const found = lstatOrNull(here);
    if (unlink) {
      if (found?.isSymbolicLink() && readlinkSync(here) === from) {
        rmSync(here);
        log(`unlinked ${rel}`);
        changed++;
      } else if (found) {
        log(`kept ${rel}: not a link made by lxx:link`);
      }
      continue;
    }
    if (found?.isSymbolicLink() && readlinkSync(here) === from) {
      log(`already linked ${rel}`);
      continue;
    }
    if (found) {
      log(`kept ${rel}: ${found.isSymbolicLink() ? 'a link to somewhere else' : 'a real directory or file'}, not replaced`);
      continue;
    }
    if (!existsSync(from)) {
      const how = rel === 'data/lxx/morpheus' ? `; build it with: sg docker -c 'npm run lxx:derive -- --book <code>'` : '';
      log(`skipped ${rel}: ${from} is not there${how}`);
      continue;
    }
    mkdirSync(dirname(here), { recursive: true });
    symlinkSync(from, here);
    log(`linked ${rel} -> ${from}`);
    changed++;
  }
  if (changed === 0) log('lxx:link: nothing changed.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(runLink(process.argv.slice(2), { cwd: process.cwd(), source: SOURCE_CHECKOUT, log: console.log }));
}
