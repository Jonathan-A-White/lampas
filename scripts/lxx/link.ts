// scripts/lxx/link.ts — npm run lxx:link [-- --unlink]
// A fresh worktree on the Laptop lacks two git-ignored directories the Septuagint scripts read: data/raw (the pinned source downloads) and data/lxx/morpheus
// (the Morpheus cache). This symlinks both from the Laptop's checkout, /home/jwhite/lampas (docs/lxx-derivation.md 'A model session', step 0; story mw-u2w5klk.288).
// Idempotent; where that checkout is not there (cloud1, cloud2) or is the cwd, it makes no link, prints one line and exits 0. --unlink removes only the
// symlinks that point into that checkout, never a real directory.
import { existsSync, lstatSync, mkdirSync, readlinkSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The Laptop's checkout, where the git-ignored data lives. */
export const SOURCE_CHECKOUT = '/home/jwhite/lampas';

/** The git-ignored directories a worktree borrows, relative to the repo root. */
export const LINKS = ['data/raw', 'data/lxx/morpheus'] as const;

export interface LinkOptions {
  cwd: string;
  /** the checkout to link from (tests give a temp dir) */
  source: string;
  log: (line: string) => void;
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
  const unknown = argv.filter((a) => a !== '--unlink');
  if (unknown.length > 0) {
    log(`lxx:link: unknown argument ${unknown.join(' ')}; the only option is --unlink`);
    return 1;
  }
  const unlink = argv.includes('--unlink');
  const cwd = resolve(opts.cwd);
  const source = resolve(opts.source);

  if (!existsSync(source)) {
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
