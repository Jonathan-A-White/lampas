// scripts/lxx/archive.ts — npm run lxx:pack -- --out <archive>   (story mw-u2w5klk.381; docs/lxx-derivation.md 'Sources on every host')
// The Septuagint's git-ignored sources, data/raw and the Morpheus cache data/lxx/morpheus, live on the Laptop. This packs them into one .tar.gz that carries a MANIFEST.sha256
// (one `<sha256>  <path>` line a file), and installs such an archive on another host after checking every file against it (`npm run lxx:link -- --from <archive>`, link.ts).
// The archive goes only to the Governor's own hosts: it holds the Morpheus cache (derived with MPL-2.0 Morpheus, not released) and the raw downloads (data/lxx/LICENSE,
// data/lxx/README.md); it is not committed and not published. Needs `tar` (GNU), which every host has.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The git-ignored directories an archive carries, relative to the repo root (the same two link.ts LINKS names). */
export const ARCHIVE_DIRS = ['data/raw', 'data/lxx/morpheus'] as const;
/** The manifest's name, at the archive's root. */
export const MANIFEST = 'MANIFEST.sha256';

const sha256 = (file: string): string => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Every file under `root/rel` (links followed), as paths relative to `root`, sorted. */
function walk(root: string, rel: string, follow: boolean): string[] {
  const here = join(root, rel);
  if (!existsSync(here)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(here, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = `${rel}/${entry.name}`;
    const stat = follow ? statSync(join(root, path)) : lstatSync(join(root, path));
    if (stat.isDirectory()) out.push(...walk(root, path, follow));
    else out.push(path);
  }
  return out;
}

/** The manifest's text for the files under `root` (links followed): sha256, two spaces, the path. */
export function manifestOf(root: string): string {
  const files = ARCHIVE_DIRS.flatMap((d) => walk(root, d, true));
  return files.map((f) => `${sha256(join(root, f))}  ${f}`).join('\n') + '\n';
}

const tar = (args: string[]): { status: number | null; stdout: string; stderr: string } => {
  const r = spawnSync('tar', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  return { status: r.error ? -1 : r.status, stdout: r.stdout ?? '', stderr: r.error ? String(r.error.message) : (r.stderr ?? '') };
};

/** Packs data/raw and data/lxx/morpheus of `cwd` (symlinks followed, so a linked worktree packs the Laptop's files) into `out` with their manifest. Returns the exit code. */
export function packSources(cwd: string, out: string, log: (line: string) => void, expectBooks: readonly string[] = []): number {
  const root = resolve(cwd);
  const archive = resolve(out);
  const lacking = ARCHIVE_DIRS.filter((d) => walk(root, d, true).length === 0);
  if (lacking.length > 0) {
    log(`lxx:pack: nothing to pack in ${lacking.join(' and ')} under ${root}; run it where the sources are (the Laptop, or a worktree linked with npm run lxx:link).`);
    return 1;
  }
  const manifest = manifestOf(root);
  const stage = mkdtempSync(join(tmpdir(), 'lxx-pack-'));
  try {
    writeFileSync(join(stage, MANIFEST), manifest);
    mkdirSync(resolve(archive, '..'), { recursive: true });
    const made = tar(['-czhf', archive, '-C', root, ...ARCHIVE_DIRS, '-C', stage, MANIFEST]);
    if (made.status !== 0) {
      log(`lxx:pack: tar failed: ${made.stderr.trim()}`);
      return 1;
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  const count = manifest.trim().split('\n').length;
  const whole = sha256(archive);
  writeFileSync(`${archive}.sha256`, `${whole}  ${archive.split('/').at(-1)}\n`);
  log(`packed ${count} files into ${archive} (${(statSync(archive).size / 1048576).toFixed(1)} MB), sha256 ${whole}`);
  const have = new Set(walk(root, 'data/lxx/morpheus', true).map((f) => f.split('/').at(-1)));
  const without = expectBooks.filter((b) => !have.has(`${b.toLowerCase()}.tsv`));
  if (without.length > 0) log(`warning: no Morpheus cache for ${without.length} books (${without.join(', ')}); build them first: sg docker -c 'npm run lxx:morpheus-check -- --all'`);
  log('copy it only to your own hosts: it is not committed and not published (data/lxx/LICENSE).');
  return 0;
}

/** The problems found checking a tree against its own MANIFEST: one line each, naming the file; empty when every file is as the manifest says. */
export function verifyTree(root: string): string[] {
  const manifestFile = join(root, MANIFEST);
  if (!existsSync(manifestFile)) return [`${MANIFEST}: not in the archive`];
  const problems: string[] = [];
  const listed = new Set<string>();
  for (const line of readFileSync(manifestFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const m = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
    if (!m) {
      problems.push(`${MANIFEST}: a line that is not '<sha256>  <path>': ${line.slice(0, 80)}`);
      continue;
    }
    const [, want, path] = m;
    if (path.startsWith('/') || path.split('/').includes('..') || !ARCHIVE_DIRS.some((d) => path.startsWith(`${d}/`))) {
      problems.push(`${path}: not under ${ARCHIVE_DIRS.join(' or ')}`);
      continue;
    }
    listed.add(path);
    const file = join(root, path);
    const found = existsSync(file) || lstatOrNull(file);
    if (!found) problems.push(`${path}: missing`);
    else if (lstatSync(file).isSymbolicLink()) problems.push(`${path}: is a link, not a file`);
    else {
      const got = sha256(file);
      if (got !== want) problems.push(`${path}: sha256 differs (manifest ${want.slice(0, 12)}…, file ${got.slice(0, 12)}…)`);
    }
  }
  for (const dir of ARCHIVE_DIRS) for (const f of walk(root, dir, false)) if (!listed.has(f)) problems.push(`${f}: not in the manifest`);
  return problems;
}

function lstatOrNull(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export interface InstallResult {
  ok: boolean;
  /** the files checked, when ok */
  files: number;
  /** one line each; empty when ok */
  problems: string[];
  /** the store already held this archive and was not unpacked again */
  held: boolean;
}

/**
 * Unpacks `archive` into `store` (a directory laid out like a checkout: <store>/data/raw, <store>/data/lxx/morpheus, <store>/MANIFEST.sha256) after checking every file against
 * the manifest. The archive is unpacked beside the store first and moved into place only when every file checks out, so a bad archive installs nothing. A store that already holds
 * this archive (the same manifest, every file still as it says) is left as it is.
 */
export function installArchive(archive: string, store: string, log: (line: string) => void): InstallResult {
  const bad = (problems: string[]): InstallResult => ({ ok: false, files: 0, problems, held: false });
  if (!existsSync(archive)) return bad([`${archive}: no such archive`]);
  const listing = tar(['-tzf', archive]);
  if (listing.status !== 0) return bad([`${archive}: not a readable .tar.gz (${listing.stderr.trim().split('\n')[0]})`]);
  const manifest = tar(['-xzOf', archive, MANIFEST]);
  if (manifest.status !== 0) return bad([`${MANIFEST}: not in ${archive}`]);
  const count = (text: string): number => text.split('\n').filter((l) => l.trim()).length;
  if (existsSync(join(store, MANIFEST)) && readFileSync(join(store, MANIFEST), 'utf8') === manifest.stdout && verifyTree(store).length === 0) {
    log(`the store ${store} already holds this archive (${count(manifest.stdout)} files verified)`);
    return { ok: true, files: count(manifest.stdout), problems: [], held: true };
  }
  const staging = `${store}.partial`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const unpacked = tar(['-xzf', archive, '-C', staging, '--no-same-owner']);
  if (unpacked.status !== 0) {
    rmSync(staging, { recursive: true, force: true });
    return bad([`${archive}: tar failed: ${unpacked.stderr.trim().split('\n')[0]}`]);
  }
  const problems = verifyTree(staging);
  if (problems.length > 0) {
    rmSync(staging, { recursive: true, force: true });
    return bad(problems);
  }
  rmSync(store, { recursive: true, force: true });
  mkdirSync(resolve(store, '..'), { recursive: true });
  renameSync(staging, store);
  log(`unpacked ${archive} into ${store}`);
  return { ok: true, files: count(manifest.stdout), problems: [], held: false };
}

async function main(argv: readonly string[]): Promise<number> {
  const at = argv.indexOf('--out');
  const out = at >= 0 ? argv[at + 1] : undefined;
  if (!out || argv.length !== 2) {
    console.log('usage: npm run lxx:pack -- --out <archive.tar.gz>');
    return 1;
  }
  const { OLD_TESTAMENT } = await import('./report');
  return packSources(process.cwd(), out, console.log, OLD_TESTAMENT.map(([code]) => code.toLowerCase()));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
