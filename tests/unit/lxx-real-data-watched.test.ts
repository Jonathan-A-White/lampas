// @vitest-environment node
// tests/unit/lxx-real-data-watched.test.ts: every input of the Septuagint ship and of its model-pass staleness check is in WATCHED (tests/support/lxx-real-data.ts), or is named here with why not
// (story mw-u2w5klk.349.139). mw-u2w5klk.349.130 changed only the verse map, scripts/data/tvtms.ts: the gate read that as nothing to run the real data for, and main went red on the stale rows.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { ALIGN_REPORT_DIR } from '../../scripts/lxx/align';
import { ALIGN_CHOICES_DIR } from '../../scripts/lxx/align-choose';
import { KNOWN_DIR } from '../../scripts/lxx/known';
import { MORPHEUS_DIR } from '../../scripts/lxx/morpheus';
import { CHOICES_DIR, RECHECK_DIR } from '../../scripts/lxx/release';
import { NOTICE } from '../../scripts/lxx/ship';
import { RAW_DIR } from '../../scripts/lxx/sources';
import { decideLxxRealData, type LxxProbe, WATCHED } from '../support/lxx-real-data';

const SRC = '/laptop/lampas';
const CWD = '/work/tree';

/** A fresh worktree on the Laptop: no sources of its own, the Laptop checkout's lent to it. */
const borrowed = (changed: string[]): LxxProbe => {
  const have = new Set([`${SRC}/data/raw/lxx`, `${SRC}/data/lxx/morpheus/gen.tsv`]);
  return { cwd: CWD, source: SRC, env: {}, exists: (p) => have.has(p), isLink: () => false, changed: () => changed };
};

const watched = (path: string): boolean => WATCHED.some((w) => path === w || path.startsWith(w));

/** The commands whose results the real-data tests check: the ship, the aligner, the model pass, and the two that count what the ship made. */
const ENTRIES = ['scripts/lxx/ship.ts', 'scripts/lxx/align.ts', 'scripts/lxx/align-choose.ts', 'scripts/lxx/align-expect.ts', 'scripts/lxx/unpaired.ts'];

/** Code the walk reaches that a change to needs no real-data run, each with why. A file under src/ is the walk's edge: it is named, and what it imports is the app's. */
const CODE_NOT_WATCHED: Readonly<Record<string, string>> = {
  'scripts/build-lemma-forms.mjs': 'the ship calls it only to write a lemma-forms folder (--lemma-forms, or one beside an output named data-lxx), after the chapters are written; the tests ship with neither, and it changes no pairing',
  'src/data/books.ts': "OT_BOOKS for the Old Testament build in scripts/data-build.ts; the Septuagint takes parseLexicon from that file, and its own books are scripts/data/tvtms.ts's and scripts/lxx/report.ts's",
  'src/data/canon.ts': "the canon's order in the New and Old Testament's index (mergeIndex); the Septuagint build writes its own index",
  'src/data/chapter.ts': "values are taken only by the New Testament's drill answers (scripts/data/drillAnswers.ts); the Septuagint's scripts take its types",
  'src/data/lemma.ts': "normaliseLemma, for the New Testament build in scripts/data-build.ts; parseLexicon does not call it",
  'src/data/meanings.ts': "the New Testament's drill answers (scripts/data/drillAnswers.ts)",
  'src/data/seed-words.ts': "the seed words the New Testament build checks (scripts/data-build.ts)",
  'src/data/variantVerse.ts': "the New Testament's variant English (scripts/data/variantEnglish.ts)",
};

/** The files and folders read at run time, which no import names, and whose change needs a real-data run. A folder ends with '/'. */
const DATA_WATCHED = [
  `${CHOICES_DIR}/`,
  `${ALIGN_CHOICES_DIR}/`,
  `${KNOWN_DIR}/`,
  `${ALIGN_REPORT_DIR}/`,
  // Lampas's verse counts (loadLxxInput): a Greek verse whose Lampas verse is not there is mapped to none
  'public/data/index.json',
];

/** The inputs read at run time that need none, each with why. */
const DATA_NOT_WATCHED: Readonly<Record<string, string>> = {
  [RAW_DIR]: 'the fetched sources, git-ignored, so no diff names them: their pins are in scripts/lxx/sources.ts, scripts/data/lxx2012.ts and scripts/data/tvtms.ts, which are watched',
  [MORPHEUS_DIR]: "the Morpheus cache, git-ignored, so no diff names it: its key (morpheusKey) and its reader are in scripts/lxx/morpheus.ts, which is watched",
  [RECHECK_DIR]: 'the second pass over a sample, read by lxx:report and lxx:pending; the ship plans no chapter from it',
  [NOTICE]: 'the notice the ship copies beside its output byte for byte; no pairing, count or stale line reads it',
  'public/data': "other than index.json, the New Testament's and Hebrew's chapters: read only for the lemma files (see scripts/build-lemma-forms.mjs above)",
};

const isFile = (path: string): boolean => existsSync(path) && statSync(path).isFile();

/** The repo's files a script imports for their values (types are erased first: a type changes nothing the ship does), as paths from the repo's root. */
function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const code = file.endsWith('.ts') ? ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText : source;
  return ts
    .preProcessFile(code, true, true)
    .importedFiles.map((f) => f.fileName)
    .filter((spec) => spec.startsWith('.'))
    .map((spec) => {
      const base = resolve(dirname(file), spec);
      const found = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(isFile);
      if (!found) throw new Error(`${file} imports ${spec}, which is no file`);
      return relative(process.cwd(), found);
    });
}

/** Every file the entry commands run: the scripts followed through their imports, and the files under src/ they import. */
function inputsOfTheShip(): string[] {
  const seen = new Set<string>();
  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    if (file.startsWith('scripts/')) for (const next of importsOf(file)) walk(next);
  };
  ENTRIES.forEach(walk);
  return [...seen].sort();
}

describe('what makes the gate run the real-data Septuagint tests', () => {
  it('reads a diff of the verse map alone as a change to run them for (mw-u2w5klk.349.130 landed main red)', () => {
    const r = decideLxxRealData(borrowed(['scripts/data/tvtms.ts']));
    expect(r.line).toContain('the work touches scripts/data/tvtms.ts');
    expect(r.run).toBe(true);
  });

  it('watches every file the ship and the model-pass checks run, or names it with why not', () => {
    const inputs = inputsOfTheShip();
    // the walk reaches what it is for: the verse map is three imports from the ship, the plural-mark link rule one from a count
    expect(inputs).toEqual(expect.arrayContaining(['scripts/data/tvtms.ts', 'scripts/lxx/morpheus.ts', 'src/reader/septuagint.ts']));
    expect(inputs.filter((f) => !watched(f) && !(f in CODE_NOT_WATCHED))).toEqual([]);
  });

  it('watches every file and folder they read at run time, or names it with why not', () => {
    expect(DATA_WATCHED.filter((path) => !watched(path))).toEqual([]);
    expect(Object.keys(DATA_NOT_WATCHED).filter((path) => watched(path) || watched(`${path}/`))).toEqual([]);
  });

  it('keeps no reason for a file that is watched or that the walk no longer reaches', () => {
    const inputs = new Set(inputsOfTheShip());
    expect(Object.keys(CODE_NOT_WATCHED).filter((f) => watched(f) || !inputs.has(f))).toEqual([]);
  });

  it('watches every test file that reads the real data', () => {
    const readers = readdirSync('tests/unit')
      .map((name) => `tests/unit/${name}`)
      // the helper's own test imports lxxRawData to give it a made-up probe: it reads no real data
      .filter((path) => path !== 'tests/unit/lxx-real-data.test.ts')
      .filter((path) => isFile(path) && /^import \{[^}]*\b(?:lxxRealData|lxxRawData)\b[^}]*\} from '\.\.\/support\/lxx-real-data';/m.test(readFileSync(path, 'utf8')));
    expect(readers).toEqual(expect.arrayContaining(['tests/unit/lxx-unpaired.test.ts', 'tests/unit/lxx-align-choose-psa.test.ts']));
    expect(readers.filter((path) => !watched(path))).toEqual([]);
  });
});
