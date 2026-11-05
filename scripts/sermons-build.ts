// scripts/sermons-build.ts — npm run sermons:build
// Builds the free sermon index (docs/sermons.md) from the sermon-index repo (https://github.com/Jonathan-A-White/sermon-index): each source it bundles is a directory there,
// sources/<id>/source.toml and rows.jsonl, read at the commit pinned in data/sermons/sources.json. The two files of each source are fetched by raw GitHub address into data/raw/sermons
// (git-ignored, skipped when present; no other network) and written as public/sermons/index.json (the sources, with licence, credit, counts and a fingerprint) and
// public/sermons/<id>/<book>.json (that book's rows), committed as public/data is. A sermon is listed under every book its preaching text touches, in Lampas's book codes;
// a cited reference is not built yet; a row with no preaching text, or one in a book the canon lacks, is left out and counted in the report. Only facts are copied: never a sermon's words.
// A second run on an unchanged commit writes the same bytes (and removes nothing it should keep).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { CANON } from '../src/data/canon';
import type { SermonBookFile, SermonIndex, SermonRow, SermonSource } from '../src/data/sermonIndex';
import { writeIfChanged } from './data/chapterWriter';
import { parseOsisRef, type VerseCounts } from './sermons/osis';
import { parseToml } from './sermons/toml';

export interface SermonsConfig {
  /** the sermon-index repo's address on GitHub */
  repo: string;
  /** the full sha the sources are read at */
  commit: string;
  /** the source ids to bundle, in the order index.json lists them */
  sources: string[];
}

/** Where raw GitHub serves `file` of `source` at `commit`: the one address the build fetches by. */
export function rawUrl(repo: string, commit: string, source: string, file: 'source.toml' | 'rows.jsonl'): string {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(repo);
  if (!match) throw new Error(`data/sermons/sources.json: repo '${repo}' is not https://github.com/<owner>/<name>`);
  return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${commit}/sources/${source}/${file}`;
}

export async function downloadTo(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  writeFileSync(part, Buffer.from(await response.arrayBuffer()));
  renameSync(part, dest);
}

/** The first 12 hex of a SHA-256 over a source's book files, in canon order (each as `<book>\n<its JSON>\n`): index.json keeps it, and a book file is asked for as ?v=<it>. */
export function sourceFingerprint(books: ReadonlyMap<string, SermonBookFile>): string {
  const hash = createHash('sha256');
  for (const canon of CANON) {
    const file = books.get(canon.code);
    if (file) hash.update(`${canon.code}\n${JSON.stringify(file)}\n`);
  }
  return hash.digest('hex').slice(0, 12);
}

interface SourceRow {
  id: string;
  title: string;
  ref?: string;
  url: string;
  alt_url?: string;
  preacher?: string;
  date?: string;
}

export interface SermonsBuildOptions {
  /** data/sermons/sources.json */
  configFile: string;
  /** the git-ignored cache of the repo's files (data/raw/sermons) */
  rawDir: string;
  /** public/sermons */
  outDir: string;
  /** fetches url into dest; the default uses fetch */
  download?: (url: string, dest: string) => Promise<void>;
  /** the verse count of each chapter of a book (public/data/index.json); the default reads that file */
  verses?: VerseCounts;
  log?: (line: string) => void;
}

export interface SourceReport {
  id: string;
  /** rows in rows.jsonl */
  read: number;
  /** rows listed (under at least one book) */
  listed: number;
  /** rows with no preaching text */
  withoutRef: number;
  /** rows left out for a reference the canon cannot hold: the book the canon lacks, or a chapter or verse past the end */
  omitted: Array<{ id: string; ref: string; reason: string }>;
  /** the books the canon lacks that rows named, with how many rows */
  missingBooks: Record<string, number>;
  /** the source's book files, concatenated and gzipped: the size a phone loads */
  gzipBytes: number;
  rawBytes: number;
}

export interface SermonsBuildResult {
  /** files whose bytes changed (written or removed) */
  written: number;
  sources: SourceReport[];
}

/** public/data/index.json's verse counts: the numbering Lampas's chapters have. */
export function canonVerses(file = 'public/data/index.json'): VerseCounts {
  const index = JSON.parse(readFileSync(file, 'utf8')) as { books: Array<{ code: string; verses: number[] }> };
  const byCode = new Map(index.books.map((b) => [b.code, b.verses]));
  return (code) => byCode.get(code);
}

function readConfig(file: string): SermonsConfig {
  const config = JSON.parse(readFileSync(file, 'utf8')) as Partial<SermonsConfig>;
  if (!config.repo || !/^[0-9a-f]{40}$/.test(config.commit ?? '') || !Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error(`${file}: needs "repo", a full 40-hex "commit" and a non-empty "sources" list`);
  }
  return config as SermonsConfig;
}

const text = (v: unknown, key: string, source: string): string => {
  if (typeof v !== 'string' || v === '') throw new Error(`${source}: source.toml has no ${key}`);
  return v;
};

async function buildSource(id: string, config: SermonsConfig, o: Required<Pick<SermonsBuildOptions, 'rawDir' | 'download' | 'verses' | 'log'>>) {
  const dir = join(o.rawDir, config.commit, id);
  for (const file of ['source.toml', 'rows.jsonl'] as const) {
    const path = join(dir, file);
    if (existsSync(path)) continue;
    const url = rawUrl(config.repo, config.commit, id, file);
    o.log(`downloading ${url}`);
    try {
      await o.download(url, path);
    } catch (error) {
      throw new Error(`source '${id}' is not in ${config.repo} at ${config.commit.slice(0, 8)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const toml = parseToml(readFileSync(join(dir, 'source.toml'), 'utf8'));
  if (toml.id !== id) throw new Error(`${id}: source.toml says id '${String(toml.id)}'`);
  const kind = text(toml.kind, 'kind', id);
  if (kind !== 'sermons') throw new Error(`${id}: kind '${kind}' is not 'sermons' (a theme source is not built here)`);

  const report: SourceReport = { id, read: 0, listed: 0, withoutRef: 0, omitted: [], missingBooks: {}, gzipBytes: 0, rawBytes: 0 };
  const books = new Map<string, Array<{ order: number; row: SermonRow }>>();
  const lines = readFileSync(join(dir, 'rows.jsonl'), 'utf8').split('\n');
  let order = 0;
  for (const [i, line] of lines.entries()) {
    if (line.trim() === '') continue;
    let r: SourceRow;
    try {
      r = JSON.parse(line) as SourceRow;
    } catch {
      throw new Error(`${id}: rows.jsonl:${i + 1} is not JSON`);
    }
    report.read++;
    if (!r.ref) {
      report.withoutRef++;
      continue;
    }
    const parsed = parseOsisRef(r.ref, o.verses);
    if (!parsed.ok) {
      report.omitted.push({ id: r.id, ref: r.ref, reason: parsed.reason });
      if (parsed.book) report.missingBooks[parsed.book] = (report.missingBooks[parsed.book] ?? 0) + 1;
      continue;
    }
    report.listed++;
    for (const part of parsed.parts) {
      // a fixed key order, so the bytes never depend on the order keys were set in
      const row: SermonRow = { id: r.id, title: r.title, ref: part, role: 'text', url: r.url };
      if (r.alt_url) row.alt = r.alt_url;
      if (r.preacher) row.preacher = r.preacher;
      if (r.date) row.date = r.date;
      const list = books.get(part.book) ?? [];
      list.push({ order: order++, row });
      books.set(part.book, list);
    }
  }
  const files = new Map<string, SermonBookFile>();
  for (const canon of CANON) {
    const list = books.get(canon.code);
    if (!list) continue;
    list.sort((a, b) => a.row.ref.chapter - b.row.ref.chapter || a.row.ref.from - b.row.ref.from || (a.row.ref.toChapter ?? a.row.ref.chapter) - (b.row.ref.toChapter ?? b.row.ref.chapter) || a.row.ref.to - b.row.ref.to || a.order - b.order);
    files.set(canon.code, { rows: list.map((x) => x.row) });
  }
  const source: SermonSource = {
    id,
    name: text(toml.name, 'name', id),
    kind,
    licence: text(toml.licence, 'licence', id),
    credit: text(toml.credit, 'credit', id),
    homepage: text(toml.homepage, 'homepage', id),
    rows: report.listed,
    books: [...files.keys()],
    fingerprint: sourceFingerprint(files),
  };
  return { source, files, report };
}

export async function runSermonsBuild(options: SermonsBuildOptions): Promise<SermonsBuildResult> {
  const { configFile, rawDir, outDir, download = downloadTo, verses = canonVerses(), log = () => undefined } = options;
  const config = readConfig(configFile);
  const sources: SermonSource[] = [];
  const reports: SourceReport[] = [];
  const made = new Map<string, string>();
  for (const id of config.sources) {
    const { source, files, report } = await buildSource(id, config, { rawDir, download, verses, log });
    const joined: Buffer[] = [];
    for (const [book, file] of files) {
      const body = JSON.stringify(file);
      made.set(`${id}/${book}.json`, body);
      joined.push(Buffer.from(body));
    }
    report.rawBytes = joined.reduce((n, b) => n + b.length, 0);
    report.gzipBytes = gzipSync(Buffer.concat(joined)).length;
    sources.push(source);
    reports.push(report);
    const missing = Object.entries(report.missingBooks).map(([book, n]) => `${book} ${n}`).join(', ');
    log(`${id}: ${report.read} rows read, ${report.listed} listed under ${source.books.length} books (${report.withoutRef} with no preaching text, ${report.omitted.length} left out${missing ? `; books the canon lacks: ${missing}` : ''}), ${(report.rawBytes / 1024).toFixed(1)} KB, ${(report.gzipBytes / 1024).toFixed(1)} KB gzipped`);
  }
  made.set('index.json', JSON.stringify({ sources } satisfies SermonIndex));

  let written = 0;
  for (const [path, body] of made) if (writeIfChanged(join(outDir, path), body)) written++;
  // what an earlier build left: a book file the source no longer lists, a source no longer bundled
  if (existsSync(outDir)) {
    for (const entry of readdirSync(outDir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const path = join(entry.parentPath, entry.name).slice(outDir.length + 1).split('\\').join('/');
      if (!made.has(path)) {
        rmSync(join(outDir, path));
        written++;
      }
    }
    for (const entry of readdirSync(outDir, { withFileTypes: true })) {
      if (entry.isDirectory() && readdirSync(join(outDir, entry.name)).length === 0) rmSync(join(outDir, entry.name), { recursive: true });
    }
  }
  log(`${sources.length} source(s), ${made.size} files, ${written ? `${written} changed` : 'unchanged'}`);
  return { written, sources: reports };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runSermonsBuild({ configFile: 'data/sermons/sources.json', rawDir: 'data/raw/sermons', outDir: 'public/sermons', log: console.log })
    .then((result) => {
      for (const r of result.sources) {
        for (const o of r.omitted) console.log(`left out: ${r.id} row ${o.id} (${o.ref}): ${o.reason}`);
      }
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
