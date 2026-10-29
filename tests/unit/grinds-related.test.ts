// The gate runs `vitest related <changed files>` ([related_tests] in millwright's config), which selects the tests that import a changed file.
// Tests read grinds/ by path, which is no import, so a grinds edit over a ceiling selected no test and landed (mw-5r3p30.860). This runs the
// gate's own selection for one grinds file of each kind and wants the test that pins that file among those selected.
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import '../support/grinds-in-graph';

const run = promisify(execFile);

// The gate's selection, asked of vitest itself: `vitest related` picks the test files whose import graph holds the changed file, then runs them;
// this stops after the picking (running the ninety-odd tests a grinds edit selects takes minutes, the picking seconds).
const SELECT = `
import { createVitest } from 'vitest/node';
const v = await createVitest('test', { watch: false, run: true, related: [process.argv[1]], reporters: [] });
const specs = await v.getRelevantTestSpecifications();
console.log(JSON.stringify(specs.map((s) => s.moduleId)));
await v.close();
process.exit(0);
`;

/** The test files `vitest related <file>` selects. */
const selected = async (file: string): Promise<string[]> => {
  const { stdout } = await run(process.execPath, ['--input-type=module', '-e', SELECT, file], { env: { ...process.env, TZ: 'UTC' }, maxBuffer: 64 * 1024 * 1024 });
  return (JSON.parse(stdout.slice(stdout.indexOf('['))) as string[]).map((name) => name.replace(/^.*\/(tests|features)\//, '$1/'));
};

// One run of the gate's command for each of these (some seconds each, so they run together): what each grinds file must select.
const PINNED: Record<string, string[]> = {
  'grinds/bible-talk.instructions/340-how-to-answer.md': ['tests/unit/bible-talk-grind.test.ts', 'tests/unit/grind-instructions-size.test.ts', 'tests/unit/grind-parts.test.ts'],
  'grinds/bible-talk.answer.schema.json': ['tests/unit/bible-talk-grind.test.ts', 'tests/unit/answer-schema-no-empty-arrays.test.ts'],
  'grinds/tips.instructions.md': ['tests/unit/grind-instructions-size.test.ts'],
  // A tutor part: the tests that pin a line's wording (today-tutor started mw-5r3p30.860) and the ones that check a request against a schema.
  'grinds/bible-talk.instructions/130-offering-the-greek.md': ['tests/unit/today-tutor.test.ts', 'tests/unit/voice-offers.test.ts', 'tests/unit/greek-offer.test.ts'],
  'grinds/bible-talk.input.schema.json': ['tests/unit/learner-profile.test.ts', 'tests/unit/question-limits.test.ts'],
  'grinds/examples/bible-talk/cleaned-question.json': ['tests/unit/grind-examples.test.ts', 'tests/unit/bible-talk-grind.test.ts'],
};

describe('vitest related for a grinds file', () => {
  const runs = new Map<string, Promise<string[]>>();
  beforeAll(() => {
    for (const file of Object.keys(PINNED)) runs.set(file, selected(file));
  });

  it.each(Object.entries(PINNED))('%s selects the tests that pin it', async (grindsFile, tests) => {
    expect(await runs.get(grindsFile)).toEqual(expect.arrayContaining(tests));
  }, 240_000);
});

// The other half of the gate's blind spot (mw-5r3p30.867): `vitest related` follows imports, so a test that reads grinds/ by path is selected for a
// grinds edit only if it imports tests/support/grinds-in-graph. This finds every test file that reads grinds/, by a path of its own or through a helper
// that does, and wants the import in it, so a new test cannot be added without it.
describe('every test that reads grinds/ has it in its import graph', () => {
  const GRAPH_IMPORT = /^import\s+['"](?:\.\.\/)+(?:tests\/)?support\/grinds-in-graph['"];?\s*$/m;
  const FS_CALL = /\b(?:readFileSync|readdirSync|statSync|existsSync|readFile|readdir)\b/;

  const walk = (dir: string, keep: RegExp): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name), keep) : keep.test(e.name) ? [join(dir, e.name)] : []));

  /** The string and template text of a file, without its comments: what it says to the file system, not what it says to a reader. */
  const literals = (source: string): string[] => {
    const out: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) out.push(node.text);
      ts.forEachChild(node, visit);
    };
    visit(ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
    return out;
  };
  const namesGrinds = (source: string): boolean => literals(source).some((t) => /(^|[/\\])grinds([/\\]|$)/.test(t));
  const relativeImports = (source: string): string[] => literals(source).filter((t) => t.startsWith('.'));

  /** Helper modules (scripts/, tests/support/) that read grinds/ with the file system, themselves or through another helper. */
  const helpers = ((): Set<string> => {
    const files = [...walk('scripts', /\.tsx?$/), ...walk('tests/support', /\.tsx?$/)].filter((f) => !f.endsWith('grinds-in-graph.ts') && !f.endsWith('grind-examples-in-graph.ts'));
    const sources = new Map(files.map((f) => [resolve(f).replace(/\.tsx?$/, ''), readFileSync(f, 'utf8')]));
    const found = new Set<string>();
    for (const [key, source] of sources) if (FS_CALL.test(source) && namesGrinds(source)) found.add(key);
    for (let grew = true; grew; ) {
      grew = false;
      for (const [key, source] of sources) {
        if (found.has(key)) continue;
        if (relativeImports(source).some((rel) => found.has(resolve(dirname(key), rel).replace(/\.tsx?$/, '')))) {
          found.add(key);
          grew = true;
        }
      }
    }
    return found;
  })();

  /** Why `source` (the text of `file`) must import the grinds module, or null when it needn't or already does. */
  const missing = (file: string, source: string): string | null => {
    if (GRAPH_IMPORT.test(source)) return null;
    if (namesGrinds(source)) return 'names a path under grinds/';
    const helper = relativeImports(source).find((rel) => helpers.has(resolve(dirname(file), rel).replace(/\.tsx?$/, '')));
    return helper ? `imports ${helper}, which reads grinds/` : null;
  };

  it('knows the helpers that read grinds/', () => {
    expect([...helpers].map((h) => h.replace(/^.*\/(scripts|tests)\//, '$1/'))).toEqual(expect.arrayContaining(['scripts/grind-parts', 'tests/support/learner']));
  });

  it('flags a test that names a grinds/ path, or imports a helper that reads it, and has no import', () => {
    const here = resolve('tests/unit/scratch.test.ts');
    expect(missing(here, `import { readFileSync } from 'fs';\nreadFileSync('grinds/tips.json');`)).not.toBeNull();
    expect(missing(here, `import { instructionsOf } from '../../scripts/grind-parts';`)).not.toBeNull();
    expect(missing(here, `// grinds/tips.json is read elsewhere\nimport { a } from '../../src/a';`)).toBeNull();
    expect(missing(here, `import '../support/grinds-in-graph';\nreadFileSync('grinds/tips.json');`)).toBeNull();
    expect(missing(resolve('features/steps/scratch.steps.ts'), `import '../../tests/support/grinds-in-graph';\nreadFileSync('grinds/tips.json');`)).toBeNull();
  });

  it('finds the import in every unit test and step file that reads grinds/', () => {
    const files = [...walk('tests/unit', /\.test\.tsx?$/), ...walk('features/steps', /\.steps\.tsx?$/)];
    const lacking = files.flatMap((f) => {
      const why = missing(resolve(f), readFileSync(f, 'utf8'));
      return why ? [`${f}: ${why}`] : [];
    });
    expect(lacking, `add the line  import '../support/grinds-in-graph';  (features/steps: '../../tests/support/grinds-in-graph') to:`).toEqual([]);
  });
});
