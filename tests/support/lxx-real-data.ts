// tests/support/lxx-real-data.ts — where the Septuagint tests that read the real, git-ignored sources (data/raw/lxx, data/lxx/morpheus) find them, and whether the gate runs them (story mw-cv2w9um).
//
// Those sources are git-ignored, so a gate in a fresh worktree or a landing checkout used to skip tests/unit/lxx-align-choose.test.ts 'Genesis 1 to 11 with the model pass' and stay green while a story broke
// its invariant (mw-u2w5klk.274.9, batches 470 and 471). The rule now:
//   - the sources are looked for in the cwd, then in the Laptop's checkout (SOURCE_CHECKOUT, scripts/lxx/link.ts): the test is given those directories, no symlink is needed;
//   - they are the cwd's own real directories (the Laptop's main checkout): the tests run, whatever the diff;
//   - they are borrowed (a symlink a Builder left with `npm run lxx:link`, or the Laptop's checkout): the tests run only when the work touches what they check (WATCHED, below: the scripts the ship runs, the
//     files it reads, the tests), so a leftover link cannot fail a gate on data the story did not change;
//   - no sources anywhere: skipped, with one line saying so; never a failure.
// tests/global-setup.ts prints the decision as one line (the gate's log) and hands it to the workers in LAMPAS_LXX_REAL_DATA; LAMPAS_LXX_REAL=run|skip forces it (run still skips when there are no sources).
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The Laptop's checkout, where the git-ignored data lives (the same as scripts/lxx/link.ts SOURCE_CHECKOUT; not imported, so global-setup stays free of the scripts). */
export const SOURCE_CHECKOUT = '/home/jwhite/lampas';

/**
 * The paths whose change makes a borrowed-data run worth it: a file, or the start of one. Every input of the ship and of its model-pass staleness check is here, or tests/unit/lxx-real-data-watched.test.ts names it
 * with why not; that test fails on an import the ship gains that is neither (mw-u2w5klk.349.139: a change to the verse map, scripts/data/tvtms.ts, ran none of these tests and landed main red).
 */
export const WATCHED = [
  // the derivation, the aligner, the ship and the Morpheus cache's key; the books' choices, model rows and sidecars, the known answers and the books' reports
  'scripts/lxx/', 'data/lxx/choices/', 'data/lxx/align/', 'data/lxx/known/', 'docs/lxx-align/',
  // what the ship runs outside scripts/lxx/: the Septuagint's build, the verse map, Brenton's English, the lexicon's reader and its glosses, the parsing codes, the rule of a linked chunk, Lampas's verse counts
  'scripts/data/', 'scripts/data-build-lxx.ts', 'scripts/data-build.ts', 'src/data/gloss.ts', 'src/data/irregular-aorists.ts', 'src/data/parseCode.ts', 'src/reader/septuagint.ts', 'public/data/index.json',
  // the app's Weave, which tests/unit/weave-lxx-every-word.test.ts and lxx-align-choose-gen.test.ts draw over the ship's output (mw-u2w5klk.349.145): the weave itself, what lays its words out and what reads them
  'src/data/weave.ts', 'src/copy/format.ts', 'src/diagram/request.ts', 'src/diagram/weave.ts', 'src/memorize/target.ts', 'src/reader/VerseText.tsx', 'src/reader/useWoven.ts', 'src/services/reading.ts', 'src/speech/readAloud.ts',
  // the tests that read the real data, and what they share
  'tests/support/lxx-real-data.ts', 'tests/unit/lxx-align-choose', 'tests/support/lxx-align-choose.ts', 'tests/unit/lxx-unpaired.test.ts', 'tests/unit/lxx-ship-jos-chapters.test.ts', 'tests/unit/lxx-ship-held-chapters.test.ts', 'tests/unit/lxx-align-low-confidence.test.ts', 'tests/unit/weave-lxx-every-word.test.ts',
] as const;

export interface LxxRealData {
  /** run the real-data tests */
  run: boolean;
  /** the directories to give runShip (rawDir, morpheusDir); empty when there are no sources */
  rawDir: string;
  morpheusDir: string;
  /** one line for the gate's log */
  line: string;
}

export interface LxxProbe {
  cwd: string;
  source: string;
  env: Record<string, string | undefined>;
  exists: (path: string) => boolean;
  /** whether the path is a symlink */
  isLink: (path: string) => boolean;
  /** the files the work changed against main (committed on the branch, staged or not), or null when git cannot say */
  changed: () => string[] | null;
}

const hasSources = (probe: LxxProbe, root: string): boolean => probe.exists(join(root, 'data/raw/lxx')) && probe.exists(join(root, 'data/lxx/morpheus/gen.tsv'));

const touches = (files: string[]): string[] => files.filter((f) => WATCHED.some((w) => f === w || f.startsWith(w)));

export function decideLxxRealData(probe: LxxProbe): LxxRealData {
  const none = { rawDir: '', morpheusDir: '' };
  const forced = probe.env.LAMPAS_LXX_REAL;
  const here = hasSources(probe, probe.cwd);
  const lent = !here && resolve(probe.cwd) !== resolve(probe.source) && hasSources(probe, probe.source);
  const root = here ? probe.cwd : lent ? probe.source : '';
  if (!root) {
    return { run: false, ...none, line: 'lxx real-data tests (lxx-align-choose.test.ts, Genesis 1 to 11 with the model pass): SKIPPED, the git-ignored sources data/raw/lxx and data/lxx/morpheus are not here or in ' + probe.source + ' (npm run lxx:link, or npm run lxx:link -- --from <archive> from npm run lxx:pack on the Laptop)' };
  }
  const dirs = { rawDir: join(root, 'data/raw/lxx'), morpheusDir: join(root, 'data/lxx/morpheus') };
  const where = root === probe.cwd ? 'this checkout' : root;
  if (forced === 'skip') return { run: false, ...dirs, line: 'lxx real-data tests (lxx-align-choose.test.ts, Genesis 1 to 11 with the model pass): SKIPPED, LAMPAS_LXX_REAL=skip' };
  if (forced === 'run') return { run: true, ...dirs, line: `lxx real-data tests (lxx-align-choose.test.ts, Genesis 1 to 11 with the model pass): RUN on the sources of ${where} (LAMPAS_LXX_REAL=run)` };
  const borrowed = lent || probe.isLink(join(probe.cwd, 'data/raw')) || probe.isLink(join(probe.cwd, 'data/lxx/morpheus'));
  if (!borrowed) return { run: true, ...dirs, line: `lxx real-data tests (lxx-align-choose.test.ts, Genesis 1 to 11 with the model pass): RUN on the sources of ${where}` };
  const files = probe.changed();
  if (files === null) return { run: true, ...dirs, line: `lxx real-data tests (lxx-align-choose.test.ts, Genesis 1 to 11 with the model pass): RUN on the sources of ${where} (git could not say what changed)` };
  const hit = touches(files);
  if (hit.length > 0) return { run: true, ...dirs, line: `lxx real-data tests (lxx-align-choose.test.ts, Genesis 1 to 11 with the model pass): RUN on the sources of ${where}, the work touches ${hit[0]}${hit.length > 1 ? ` and ${hit.length - 1} more` : ''}` };
  return { run: false, ...dirs, line: `lxx real-data tests (lxx-align-choose.test.ts, Genesis 1 to 11 with the model pass): SKIPPED, the sources are borrowed from ${where} and the work touches none of ${WATCHED.slice(0, 4).join(', ')} or the rest of WATCHED` };
}

const git = (cwd: string, args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** The files changed against main: the branch's own commits since it left origin/main or main, and what is staged or not yet committed. Null when there is no git or no main to compare with. */
export function changedAgainstMain(cwd: string): string[] | null {
  try {
    let base = '';
    for (const ref of ['origin/main', 'main']) {
      try {
        base = git(cwd, ['merge-base', 'HEAD', ref]);
        if (base) break;
      } catch {
        // try the next ref
      }
    }
    if (!base) return null;
    const names = (args: string[]): string[] => git(cwd, args).split('\n').filter(Boolean);
    return [...new Set([...names(['diff', '--name-only', base, 'HEAD']), ...names(['diff', '--name-only', 'HEAD']), ...names(['ls-files', '--others', '--exclude-standard'])])];
  } catch {
    return null;
  }
}

const isLink = (path: string): boolean => {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
};

export function realProbe(cwd: string = process.cwd(), env: Record<string, string | undefined> = process.env): LxxProbe {
  return { cwd, source: SOURCE_CHECKOUT, env, exists: existsSync, isLink, changed: () => changedAgainstMain(cwd) };
}

/** The decision global-setup made (LAMPAS_LXX_REAL_DATA), or made now when a test runs without it. */
export function lxxRealData(): LxxRealData {
  const given = process.env.LAMPAS_LXX_REAL_DATA;
  if (given) return JSON.parse(given) as LxxRealData;
  return decideLxxRealData(realProbe());
}

/**
 * For a test that runs the ship with --no-morpheus on a book, so needs the pinned raw sources alone (Psalms, Isaiah): the decision's directory, the cwd's or the lent one, and its verdict (mw-u2w5klk.349.144).
 * The decision counts a checkout with data/raw/lxx and no Morpheus cache as having no sources; such a checkout's own raw sources still run these, unless LAMPAS_LXX_REAL=skip.
 */
export function lxxRawData(real: LxxRealData = lxxRealData(), probe: LxxProbe = realProbe()): Pick<LxxRealData, 'run' | 'rawDir'> {
  if (real.rawDir) return { run: real.run, rawDir: real.rawDir };
  const own = join(probe.cwd, 'data/raw/lxx');
  return probe.env.LAMPAS_LXX_REAL !== 'skip' && probe.exists(own) ? { run: true, rawDir: own } : { run: false, rawDir: '' };
}
