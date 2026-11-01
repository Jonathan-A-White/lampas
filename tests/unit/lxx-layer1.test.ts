// The Septuagint derivation's layer 1 (scripts/lxx/, docs/lxx-derivation.md; story mw-u2w5klk.1) on fixtures, never the network.
// tests/fixtures/lxx/swete-gen-1.csv and swete-psa-22.csv are Swete's Gen 1 and Greek Ps 22 from the pinned eliranwong/LXX-Swete-1930 files: the rows of
// 00-Swete_versification.csv for the chapter's verses and the next chapter's first verse (where the last verse ends), a blank line, then the rows of
// 01-Swete_word_with_punctuations.csv for those verses, unchanged (Swete's text is public domain; eliranwong's LICENSE and README sit beside them).
// tagnt-slice.tsv is the rows of the pinned TAGNT whose form, as keyOf or bareOf writes it, is one these words are looked up as (a spelling fallback's too),
// cut to the columns the reader reads (reference, form, grammar, lemma) and thinned: each kind of row keeps at most three rows, or a share of its rows,
// except where that would change layer 1's answer, its candidates or its notes for any word of the two chapters, with John hidden or not (checked against
// the whole of TAGNT when the slice was made). So the supports in a fixture run's candidates are not the New Testament's counts; the answers are.
// Those are its first 3,683 rows; the rows after them are the parser's (layer 2, mw-u2w5klk.2: tests/unit/lxx-parser.test.ts says how they were cut), and
// tbesg-slice.txt is its lemmas. Layer 2 now runs in these tests too, so a count of layer 1's words filters on the layer; and the agreement check
// (mw-u2w5klk.3, tests/unit/lxx-agreement.test.ts) runs after them, so a count of what layers 1 and 2 settle reads the result before it (`beforeCheck`).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { DERIVED_HEADER, PENDING_HEADER, runDerive, type BookResult, type DeriveInput, type DerivedWord, type PendingWord } from '../../scripts/lxx/derive';
import { RAW_DIR, STEP, SWETE, fetchPinned, pinnedPath } from '../../scripts/lxx/sources';
import { keyOf, spellings, sweteTokens } from '../../scripts/lxx/swete';
import { DOMINANT, DOMINANT_MIN, readTagnt, settle, type Analysis } from '../../scripts/lxx/tagnt';

const FIXTURES = 'tests/fixtures/lxx';
const tagnt = [readFileSync(join(FIXTURES, 'tagnt-slice.tsv'), 'utf8')];
const tbesg = readFileSync(join(FIXTURES, 'tbesg-slice.txt'), 'utf8');
function swete(file: string): DeriveInput {
  const [versification, words] = readFileSync(join(FIXTURES, file), 'utf8').split('\n\n');
  return { versification, words, tagnt, tbesg };
}
const GEN_1 = swete('swete-gen-1.csv');
const PSA_22 = swete('swete-psa-22.csv');

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const run = (input: DeriveInput, argv: string[], outDir = tmp()): Promise<BookResult> => runDerive(argv, { input, outDir });
const nfc = (s: string): string => s.normalize('NFC');
/** The word whose display text is this (Swete writes oxia, not tonos: compared in NFC), and what layer 1 made of it. */
function wordOf(result: BookResult, display: string, nth = 0): { ref: string; form: string; display: string; out: DerivedWord | PendingWord; settled: boolean } {
  const word = result.words.filter((w) => nfc(w.display) === nfc(display))[nth];
  if (!word) throw new Error(`no word ${display}`);
  const derived = result.derived.find((w) => w.ref === word.ref);
  const pending = result.pending.find((w) => w.ref === word.ref);
  return { ...word, out: (derived ?? pending)!, settled: Boolean(derived) };
}
const has = (cs: readonly Analysis[], lemma: string, morph: string): boolean => cs.some((c) => c.lemma === lemma && c.morph === morph);

describe("layer 1 on Swete's Gen 1 (npm run lxx:derive -- --book gen)", async () => {
  const gen = await run(GEN_1, ['--book', 'gen']);

  it('settles 545 of the 751 words, the probe’s count to within one, and leaves the rest to the parser (layer 2) or pending', () => {
    expect(gen.words).toHaveLength(751);
    expect(Math.abs(gen.beforeCheck.derived.filter((w) => w.layer === 1).length - 545)).toBeLessThanOrEqual(1);
    expect(gen.beforeCheck.derived.length + gen.beforeCheck.pending.length).toBe(751);
    expect(gen.beforeCheck.derived.every((w) => w.layer === 1 || w.layer === 2)).toBe(true);
    expect(gen.derived.length + gen.pending.length).toBe(751);
  });

  it('matches ΕΝ ΑΡΧΗ without accents, and leaves ΑΡΧΗ pending between nominative and dative', () => {
    const en = wordOf(gen, 'ΕΝ');
    expect(en.ref).toBe('Gen.1:1#1');
    expect(en.settled).toBe(true);
    expect([(en.out as DerivedWord).lemma, (en.out as DerivedWord).morph]).toEqual(['ἐν', 'PREP']);
    expect(en.out.notes).toEqual(expect.arrayContaining(['unaccented: matched without accents', 'capitals']));
    const arche = wordOf(gen, 'ΑΡΧΗ');
    expect(arche.ref).toBe('Gen.1:1#2');
    expect(arche.settled).toBe(false);
    expect(has(arche.out.candidates, 'ἀρχή', 'N-NSF') && has(arche.out.candidates, 'ἀρχή', 'N-DSF')).toBe(true);
  });

  it('counts ⸆ and ⸂⸆⸃ as the editor’s signs, not words', () => {
    expect(gen.signs.map((s) => `${s.verse} ${s.sign}`)).toEqual(['Gen.1:13 ⸂⸆⸃', 'Gen.1:14 ⸆', 'Gen.1:19 ⸆', 'Gen.1:26 ⸂⸆⸃', 'Gen.1:31 ⸆']);
    expect(gen.words.some((w) => /[⸂⸆⸃]/.test(w.display) && !/\p{L}/u.test(w.display))).toBe(false);
    // the word after a sign is numbered as if the sign were not there
    const sign = gen.signs[1];
    const before = gen.words.filter((w) => w.verse === sign.verse && w.line < sign.line).length;
    const after = gen.words.find((w) => w.verse === sign.verse && w.line > sign.line);
    expect(after?.ref).toBe(`${sign.verse}#${before + 1}`);
  });

  it('looks πληθυ]νέσθωσαν up as πληθυνέσθωσαν and keeps the bracket for display', () => {
    const w = wordOf(gen, 'πληθυ]νέσθωσαν');
    expect(w.display).toContain(']');
    expect(nfc(w.form)).toBe('πληθυνέσθωσαν');
    expect(keyOf(w.display)).toBe('πληθυνέσθωσαν');
    expect(w.out.notes).toContain('brackets: letters Swete supplied');
  });

  it('reaches ἴδεν by the ει/ι fallback, as εἶδεν', () => {
    const w = wordOf(gen, 'ἴδεν');
    expect(spellings(w.form).map(([why]) => why)).toContain('ι read as ει');
    expect(w.settled).toBe(true);
    expect([(w.out as DerivedWord).lemma, (w.out as DerivedWord).morph]).toEqual(['εἴδω', 'V-2AAI-3S']);
    expect(w.out.notes).toContain('spelling: ei written i');
    expect(gen.words.filter((x) => nfc(x.display) === 'ἴδεν').every((x) => gen.derived.some((d) => d.ref === x.ref))).toBe(true);
  });

  it('adds the movable ν to πᾶσι, but never takes φαίνειν, an infinitive, for φαίνει', () => {
    const pasi = wordOf(gen, 'πᾶσι');
    expect(pasi.out.notes).toContain('spelling: movable nu added');
    expect(pasi.out.candidates.length).toBeGreaterThan(1);
    // the parser reads it as the infinitive it is (story mw-u2w5klk.2), and no spelling of φαίνει is tried
    const phainein = wordOf(gen, 'φαίνειν');
    expect(phainein.out.notes.some((n) => n.startsWith('spelling'))).toBe(false);
    expect(phainein.out.candidates.some((c) => c.morph === 'V-PAI-3S')).toBe(false);
    expect((phainein.out as DerivedWord).layer).not.toBe(1);
  });

  it('takes a form with several analyses when one has at least 95% of 20 or more words', () => {
    const dominant = gen.derived.filter((w) => w.layer === 1 && w.candidates.length > 1);
    expect(dominant.length).toBeGreaterThan(0);
    for (const w of dominant) {
      const total = w.candidates.reduce((s, c) => s + c.support, 0);
      expect(total).toBeGreaterThanOrEqual(DOMINANT_MIN);
      expect(w.candidates[0].share).toBeGreaterThanOrEqual(DOMINANT);
      expect(w.confidence).toBe(Math.round(w.candidates[0].share * 97) / 100);
    }
  });
});

describe("layer 1 on Swete's Greek Ps 22", async () => {
  const psa = await run(PSA_22, ['--book', 'psa']);

  it('settles the probe’s 78 of the 104 words', () => {
    expect(psa.words).toHaveLength(104);
    expect(psa.beforeCheck.derived.filter((w) => w.layer === 1)).toHaveLength(78);
  });

  it('looks ἐξέθρεψέν (before the enclitic με) up as ἐξέθρεψεν', () => {
    const w = wordOf(psa, 'ἐξέθρεψέν');
    expect(keyOf(w.form)).toBe('ἐξέθρεψεν');
    const [verse, n] = w.ref.split('#');
    expect(psa.words.find((x) => x.ref === `${verse}#${Number(n) + 1}`)?.form).toBe('με');
    expect(keyOf('ἐνώπιόν')).toBe('ἐνώπιον');
  });

  it('reaches Δαυείδ by reading its ει as ι', () => {
    const w = wordOf(psa, 'Δαυείδ.');
    expect(w.out.notes).toContain('spelling: i written ei');
    expect(w.out.candidates.some((c) => c.lemma.includes('Δαυίδ'))).toBe(true);
  });
});

describe('the 95%-of-20 rule', () => {
  const analyses = (...supports: number[]): Analysis[] => {
    const total = supports.reduce((s, n) => s + n, 0);
    return supports.map((support, i) => ({ lemma: `l${i}`, morph: 'X', support, share: support / total }));
  };
  it('settles one analysis however rarely it is seen, surer when seen three times', () => {
    expect(settle(analyses(1))?.confidence).toBe(0.9);
    expect(settle(analyses(2))?.confidence).toBe(0.9);
    expect(settle(analyses(3))?.confidence).toBe(0.97);
  });
  it('settles a dominant analysis only at 95% of 20 or more', () => {
    expect(settle(analyses(19, 1))?.analysis.lemma).toBe('l0');
    expect(settle(analyses(19, 1))?.confidence).toBe(0.92);
    expect(settle(analyses(18, 1))).toBeUndefined();
    expect(settle(analyses(94, 6))).toBeUndefined();
    expect(settle(analyses(95, 5))?.analysis.lemma).toBe('l0');
  });
});

describe('--hide jhn: a known-answer run', async () => {
  const shown = await run(GEN_1, ['--book', 'gen']);
  const hidden = await run(GEN_1, ['--book', 'gen', '--hide', 'jhn']);

  it('puts no John row of TAGNT in the form index', () => {
    expect(readTagnt(tagnt).some((r) => r.book === 'Jhn')).toBe(true);
    expect(readTagnt(tagnt, 'jhn').some((r) => r.book === 'Jhn')).toBe(false);
    expect(readTagnt(tagnt, 'jhn')).toHaveLength(readTagnt(tagnt).filter((r) => r.book !== 'Jhn').length);
  });

  it('sends a form only John has (ἐλάσσω, John 2:10) past layer 1 to the parser', () => {
    expect((wordOf(shown, 'ἐλάσσω').out as DerivedWord).layer).toBe(1);
    const w = wordOf(hidden, 'ἐλάσσω');
    expect((w.out as DerivedWord).layer).not.toBe(1);
    expect(w.out.notes).toContain('not in the New Testament: for the parser');
  });
});

const GREEK = /[Ͱ-Ͽἀ-῿]/;

describe('the derived and pending files', async () => {
  const outDir = tmp();
  const gen = await run(GEN_1, ['--book', 'gen'], outDir);
  const derivedText = readFileSync(join(outDir, 'derived', 'gen.tsv'), 'utf8');
  const pendingText = readFileSync(join(outDir, 'pending', 'gen.tsv'), 'utf8');
  const rowsOf = (text: string): string[][] => text.trimEnd().split('\n').map((l) => l.split('\t'));

  it('hold the columns of docs/lxx-derivation.md', () => {
    expect(rowsOf(derivedText)[0]).toEqual(DERIVED_HEADER);
    expect(DERIVED_HEADER).toEqual(['ref', 'lemma', 'parsing', 'layer', 'confidence', 'candidates', 'notes']);
    expect(rowsOf(pendingText)[0]).toEqual(PENDING_HEADER);
    expect(rowsOf(derivedText)).toHaveLength(gen.derived.length + 1);
    expect(rowsOf(pendingText)).toHaveLength(gen.pending.length + 1);
    // candidates are 'lemma/parsing/support | ...', the settled analysis first
    for (const row of rowsOf(derivedText).slice(1)) {
      const [lemma, parsing, support] = row[5].split(' | ')[0].split('/');
      expect([lemma, parsing]).toEqual([row[1], row[2]]);
      expect(support).toMatch(/^\d+$/);
    }
  });

  it('never carry the pinned text’s form for a ref (only the lemma and candidates, Lampas’s own data, are Greek)', () => {
    // the pinned text, read afresh: ref -> the token as Swete has it
    const tokens = new Map(sweteTokens(GEN_1.versification, GEN_1.words).words.map((w) => [w.ref, w]));
    for (const [text, header] of [[derivedText, DERIVED_HEADER], [pendingText, PENDING_HEADER]] as const) {
      const ownData = new Set(['lemma', 'candidates'].map((c) => header.indexOf(c)));
      for (const row of rowsOf(text).slice(1)) {
        const token = tokens.get(row[0])!;
        row.forEach((cell, i) => {
          if (ownData.has(i)) return;
          expect(cell).not.toMatch(GREEK);
          expect(cell.includes(token.display) || cell.includes(token.form)).toBe(false);
        });
      }
    }
    expect(derivedText.includes('πληθυ]') || pendingText.includes('πληθυ]')).toBe(false);
  });

  it('name each word of the pinned text once, by a ref that resolves to its token', () => {
    const refs = [...rowsOf(derivedText).slice(1), ...rowsOf(pendingText).slice(1)].map((r) => r[0]);
    const tokens = sweteTokens(GEN_1.versification, GEN_1.words).words.map((w) => w.ref);
    expect(new Set(refs).size).toBe(refs.length);
    expect([...refs].sort()).toEqual([...tokens].sort());
  });

  it('come out the same bytes from a second run', async () => {
    await run(GEN_1, ['--book', 'gen'], outDir);
    expect(readFileSync(join(outDir, 'derived', 'gen.tsv'), 'utf8')).toBe(derivedText);
    expect(readFileSync(join(outDir, 'pending', 'gen.tsv'), 'utf8')).toBe(pendingText);
    const other = tmp();
    await run({ ...GEN_1, tagnt: [...tagnt].reverse() }, ['--book', 'gen'], other);
    expect(readFileSync(join(other, 'derived', 'gen.tsv'), 'utf8')).toBe(derivedText);
  });
});

describe('the pinned sources', () => {
  it('live under data/raw/lxx/<repo>/<commit>/', () => {
    expect(pinnedPath(RAW_DIR, SWETE, 'LICENSE')).toBe('data/raw/lxx/eliranwong/LXX-Swete-1930/1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33/LICENSE');
    expect(STEP.commit).toBe('be4191f0082aeedddb0eff0c02c966292b2bd641');
  });

  it('are fetched only when absent', async () => {
    const rawDir = tmp();
    const asked: string[] = [];
    const fake = async (url: string, dest: string): Promise<void> => {
      asked.push(url);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, 'x');
    };
    const licence = pinnedPath(rawDir, SWETE, 'LICENSE');
    mkdirSync(dirname(licence), { recursive: true });
    writeFileSync(licence, 'GPL');
    expect(await fetchPinned(rawDir, SWETE, fake)).toHaveLength(3);
    expect(asked.every((u) => u.startsWith('https://raw.githubusercontent.com/eliranwong/LXX-Swete-1930/1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33/'))).toBe(true);
    expect(asked.some((u) => u.endsWith('/LICENSE'))).toBe(false);
    expect(readFileSync(licence, 'utf8')).toBe('GPL');
    expect(await fetchPinned(rawDir, SWETE, fake)).toEqual([]);
  });
});

describe("Lampas's derived data: its licence, README and documentation", () => {
  it('is MIT', () => {
    const licence = readFileSync('data/lxx/LICENSE', 'utf8');
    expect(licence).toMatch(/^MIT License/);
    expect(licence).toContain('Permission is hereby granted, free of charge');
  });

  it('credits TAGNT and TBESG with the changed: line, and says the files hold no Greek of Swete’s', () => {
    const readme = readFileSync('data/lxx/README.md', 'utf8');
    for (const s of ['TAGNT', 'TBESG', 'CC BY 4.0', "changed: applied to the Septuagint by Lampas's derivation", "no Greek of Swete's", 'npm run lxx:derive']) {
      expect(readme).toContain(s);
    }
  });

  it('keeps the derived and pending files out of git', () => {
    const ignored = readFileSync('.gitignore', 'utf8').split('\n').map((l) => l.trim());
    expect(ignored).toEqual(expect.arrayContaining(['data/lxx/derived', 'data/lxx/pending']));
  });

  it('is documented: the layers, the files and the commands', () => {
    const doc = readFileSync('docs/lxx-derivation.md', 'utf8');
    for (const s of ['Layer 1', 'Layer 2', 'Layer 3', 'data/lxx/derived/<book>.tsv', 'data/lxx/pending/<book>.tsv', 'npm run lxx:derive -- --book gen', '--hide jhn']) {
      expect(doc).toContain(s);
    }
    for (const column of DERIVED_HEADER) expect(doc).toContain(`\`${column}\``);
    expect(JSON.parse(readFileSync('package.json', 'utf8')).scripts['lxx:derive']).toBe('tsx scripts/lxx/derive.ts');
  });

  it('ships Swete’s fixture text with eliranwong’s licence and README beside it', () => {
    expect(existsSync(join(FIXTURES, 'LICENSE-LXX-Swete-1930'))).toBe(true);
    expect(readFileSync(join(FIXTURES, 'LICENSE-LXX-Swete-1930'), 'utf8')).toContain('GNU GENERAL PUBLIC LICENSE');
    expect(existsSync(join(FIXTURES, 'README-LXX-Swete-1930.md'))).toBe(true);
  });
});
