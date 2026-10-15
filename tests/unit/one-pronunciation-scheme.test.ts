// Every Greek sound comes from one pronunciation scheme (mw-5r3p30.268, his words: "make sure that's true across the board for the application"): no
// file of src/ or grinds/ outside src/speech/pronunciation.ts and src/speech/schemes/ says, spells or describes a Greek sound by hand, or imports a
// scheme by name, so another scheme (Erasmian) plugs in without touching the rest. The scan is tests/support/sound-rules-scan.ts.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pronunciationOf, tutorGuideOf } from '../../src/speech/pronunciation';
import { respellModern } from '../../src/speech/schemes/modern';
import { soundRulesIn } from '../support/sound-rules-scan';

/**
 * What the scan finds that is not a Greek sound rule, or is another story's: [file, the matched text, why it stays]. A new entry needs a reason a
 * later Builder can check; an entry the scan no longer finds fails the test, so the list never keeps a dead line.
 */
const ALLOWED: readonly [string, string, string][] = [
  ['src/data/grammar/ladder.ts', 'Modern Greek', "the 'accents' and 'marks-change-word' texts: mw-5r3p30.312 moves both into the scheme's lessons"],
  ['grinds/bible-talk.instructions.md', 'Modern Greek', "the settings list, written by npm run grind:build from the scheme's own label"],
  ['grinds/verse-read.instructions.md', 'LEE-vites', 'an English respelling of an English word, for the English voice'],
  ['src/data/grammar-concepts.ts', 'AIR-ist', 'how to say the English grammar word "aorist"'],
];

/** Every file the scan reads: the app's code and the grinds the tutor reads. A grind's examples are scenarios run against one named scheme, like the tests. */
const scanned = (): string[] =>
  execSync('git ls-files src grinds', { encoding: 'utf8' })
    .split('\n')
    .filter((f) => (f.startsWith('src/') && /\.(ts|tsx)$/.test(f)) || (f.startsWith('grinds/') && !f.startsWith('grinds/examples/') && /\.(md|json)$/.test(f)));

describe('every Greek sound comes from the pronunciation scheme', () => {
  const found = scanned().flatMap((file) => soundRulesIn(file, readFileSync(file, 'utf8')).map((r) => ({ file, ...r })));
  const allowed = (f: { file: string; text: string }): boolean => ALLOWED.some(([file, text]) => f.file === file && f.text === text);

  it('reads the app and its grinds', () => {
    const files = scanned();
    expect(files).toContain('src/WordSheet.tsx');
    expect(files).toContain('grinds/bible-talk.instructions.md');
    expect(files.some((f) => f.startsWith('src/speech/schemes/'))).toBe(true);
  });

  it('finds no sound rule outside src/speech/pronunciation.ts and src/speech/schemes/', () => {
    expect(found.filter((f) => !allowed(f)).map((f) => `${f.file}: ${f.rule}: ${f.text}`)).toEqual([]);
  });

  it('keeps no allowed line the scan no longer finds', () => {
    for (const [file, text] of ALLOWED) expect(found.some((f) => f.file === file && f.text === text), `${file}: ${text}`).toBe(true);
  });
});

describe('the scan', () => {
  it("fails on an 'as in' sound line planted outside the schemes, and lets the scheme's own file hold it", () => {
    const planted = "export const tip = 'ου is oo, as in “food”';\n";
    expect(soundRulesIn('src/data/grammar/planted.ts', planted).map((r) => r.rule)).toEqual(['a sound keyed to an English word', 'a Greek letter given a Latin sound']);
    expect(soundRulesIn('src/speech/schemes/planted.ts', planted)).toEqual([]);
    expect(soundRulesIn('src/speech/pronunciation.ts', planted)).toEqual([]);
  });

  it('reads what a screen shows in JSX and in a template, and not the comments', () => {
    expect(soundRulesIn('src/Planted.tsx', 'export const P = () => <p>Say β like v, as in vase.</p>;\n')).not.toEqual([]);
    expect(soundRulesIn('src/planted.ts', 'export const line = (w: string) => `${w}: χ is kh`;\n')).not.toEqual([]);
    expect(soundRulesIn('src/planted.ts', '// ου is oo, as in food\nexport const x = 1;\n')).toEqual([]);
  });

  it("finds a respelling, a scheme named by hand and a scheme imported by name, but not a language tag or a word's gloss", () => {
    expect(soundRulesIn('src/planted.ts', "export const s = 'khree-STO';\n")).toHaveLength(1);
    expect(soundRulesIn('grinds/planted.instructions.md', 'In modern Greek, say it so.')).toHaveLength(1);
    expect(soundRulesIn('src/planted.ts', "import { MODERN } from '../speech/schemes/modern';\nexport const m = MODERN;\n")).toHaveLength(1);
    expect(soundRulesIn('src/planted.ts', "export const t = ['el-GR', 'en-US'];\n")).toEqual([]);
    expect(soundRulesIn('src/planted.ts', "export const g = 'λύομεν is “we loose”';\n")).toEqual([]);
  });

  it("reads a grind's instructions whole", () => {
    expect(soundRulesIn('grinds/planted.instructions.md', 'Tell him that\nβ is v and δ is dh as in "this".').map((r) => r.text)).toEqual(expect.arrayContaining(['β is v', 'δ is dh']));
  });
});

describe('what the tutor is told of the sounds is the scheme\'s', () => {
  it("gives Modern Greek's guide examples the respeller agrees with, and the rules the grinds no longer write", () => {
    const guide = tutorGuideOf(pronunciationOf('modern'));
    const examples = [...guide.matchAll(/(\p{Script=Greek}+) is ([A-Za-z-]*[A-Z]{2,}[A-Za-z-]*)(?=[,.])/gu)].map((m) => [m[1], m[2]]);
    expect(examples.map(([word]) => word)).toEqual(['ταῦτα', 'Πάντοτε', 'χαίρετε']);
    for (const [word, said] of examples) expect(respellModern(word), word).toBe(said);
    expect(guide).toMatch(/^Modern Greek/);
    for (const rule of ['αυ and ευ are af and ef', 'av and ev', 'αι is e', 'ει, οι, υι, η, ι and υ are ee', 'ου is oo', 'β is v', 'δ is dh', 'γ is gh', 'or y before e or i', 'never "aw"', 'Erasmian']) {
      expect(guide, rule).toContain(rule);
    }
  });

  it('every grind example that names a pronunciation carries that scheme\'s guide, word for word', () => {
    const examples = execSync('git ls-files grinds/examples', { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.json'));
    const named = examples.map((f) => ({ f, request: (JSON.parse(readFileSync(f, 'utf8')) as { request?: Record<string, unknown> }).request ?? {} })).filter((e) => 'pronunciation' in e.request);
    expect(named.length).toBeGreaterThan(3);
    for (const { f, request } of named) expect(request.pronunciation_guide, f).toBe(tutorGuideOf(pronunciationOf(request.pronunciation)));
  });
});
