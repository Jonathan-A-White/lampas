// The Septuagint derivation's second method on the words with no candidate (scripts/lxx/morpheus.ts, derive.ts, release.ts, report.ts;
// docs/lxx-derivation.md, 'Morpheus'; story mw-u2w5klk.6): Perseus' Morpheus run from its Docker image, its analyses mapped to TAGNT's codes, kept in a
// git-ignored cache and added to derive.ts as candidates. Never the network, never Docker: tests/fixtures/lxx/morpheus-sample.tsv stands for Morpheus's
// output on the seven forms of the Gen 1 and Ps 22 fixtures that have no candidate (see its header: written in the shape of Morpheus's own
// test/fixture.json, not captured). The raw strings of the mapping tests are from that file.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { runDerive, type BookResult, type DeriveInput } from '../../scripts/lxx/derive';
import {
  MORPHEUS,
  dockerEngine,
  ensureCache,
  formOf,
  fromBeta,
  mapAnalysis,
  morpheusKey,
  parseAnalysis,
  parseCache,
  parseCruncher,
  toBeta,
  cacheText,
  type MorpheusEngine,
} from '../../scripts/lxx/morpheus';
import { readChoices } from '../../scripts/lxx/choices';
import { morpheusCounts, runRelease } from '../../scripts/lxx/release';
import { runReport } from '../../scripts/lxx/report';
import { keyOf } from '../../scripts/lxx/swete';

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
  const dir = mkdtempSync(join(tmpdir(), 'lampas-morpheus-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const nfc = (s: string): string => s.normalize('NFC');

/** The sample file: Greek form -> the <NL> segments, with ⇥ read as a tab. */
const SAMPLE = new Map(
  readFileSync(join(FIXTURES, 'morpheus-sample.tsv'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l): [string, string] => {
      const [form, segments = ''] = l.split('\t');
      return [toBeta(nfc(form))!, segments.replaceAll('⇥', '\t')];
    }),
);
const SEVEN = ['Γενηθήτωσαν', 'ζωσῶν', 'ἐξέθρεψεν', 'αὐταί', 'ἐλίπανας', 'καταδιώξεται', 'μακρότητα'];

/** Morpheus as the sample file has it: for each beta-code line, the line and the segments (none for a form the file does not give). */
function fakeEngine(calls: string[][] = []): MorpheusEngine {
  return {
    unavailable: () => undefined,
    crunch(forms) {
      calls.push([...forms]);
      return forms.map((f) => `${f}\n${SAMPLE.get(f) ?? ''}${SAMPLE.get(f) ? '\n' : ''}`).join('');
    },
  };
}

describe('beta code, the letters Morpheus reads and writes', () => {
  it('writes Greek as Perseus beta code: breathing, then accent, then iota subscript, a capital after a star', () => {
    expect(toBeta('ἐξέθρεψεν')).toBe('e)ce/qreyen');
    expect(toBeta('Γενηθήτωσαν')).toBe('*genhqh/twsan');
    expect(toBeta('Ἀρταξέρξης')).toBe('*)artace/rchs');
    expect(toBeta('τῷ')).toBe('tw=|');
    expect(toBeta('ἅγιος')).toBe('a(/gios');
    expect(toBeta('Ἄβελ')).toBe('*)/abel');
  });

  it('reads beta code back as NFC Greek with a final sigma, dropping the marks of quantity and a homograph number', () => {
    expect(fromBeta('gi/gnomai')).toBe(nfc('γίγνομαι'));
    expect(fromBeta('a)/nqrwpos')).toBe(nfc('ἄνθρωπος'));
    expect(fromBeta('*da_rei_/ou')).toBe(nfc('Δαρείου'));
    expect(fromBeta('pa/reimi1')).toBe(nfc('πάρειμι'));
    expect(fromBeta('tw=|')).toBe(nfc('τῷ'));
    expect(fromBeta('*)abraa/m')).toBe(nfc('Ἀβραάμ'));
  });

  it('round-trips a word, whatever its accent', () => {
    for (const w of ['λόγος', 'ἐξέθρεψεν', 'ᾠδή', 'Ἰησοῦς', 'ὑπάρχω', 'μακρότης']) expect(fromBeta(toBeta(nfc(w))!)).toBe(nfc(w));
  });

  it('keys a form as the look-up does (an enclitic’s second accent dropped, grave read as acute), keeping a capital that begins a word with lower case', () => {
    expect(morpheusKey('ἐξέθρεψέν')).toBe(nfc('ἐξέθρεψεν'));
    expect(morpheusKey('Γενηθήτωσαν')).toBe(nfc('Γενηθήτωσαν'));
    expect(morpheusKey('ΕΝ')).toBe('εν');
    expect(morpheusKey('[τοῖ]ς')).toBe(keyOf('τοῖς'));
  });
});

describe('the output of Morpheus (cruncher -S), as its own test/fixture.json shows it', () => {
  it('reads an echo line and the <NL> segments after it, one entry for each form, an unknown form with none', () => {
    const out = '*darei/ou\n<NL>N *da_rei_/ou,*darei=os  masc gen sg\t\t\tos_ou</NL>\nlingua\nne/os\n<NL>N ne/os  masc nom comp sg\t\t\tos_h_on</NL><NL>N ne/os  masc nom comp sg\tattic\t\tos_on</NL>\n';
    const entries = parseCruncher(out);
    expect(entries.map((e) => [e.input, e.raws.length])).toEqual([
      ['*darei/ou', 1],
      ['lingua', 0],
      ['ne/os', 2],
    ]);
    expect(entries[0].raws[0]).toEqual({ pos: 'N', lemma: '*darei=os', features: 'masc gen sg', dialects: '', flags: '', classes: 'os_ou' });
    expect(entries[2].raws[1].dialects).toBe('attic');
  });

  it('splits a segment into its part of speech, last lemma, features, dialects, flags and classes', () => {
    expect(parseAnalysis('N kai/,kai/ \t\tindeclform\tconj')).toEqual({ pos: 'N', lemma: 'kai/', features: '', dialects: '', flags: 'indeclform', classes: 'conj' });
    expect(parseAnalysis('V a)sqene/w  imperf ind act 3rd sg\tattic epic ionic\tcontr\tew_pr,ew_denom')).toEqual({
      pos: 'V',
      lemma: 'a)sqene/w',
      features: 'imperf ind act 3rd sg',
      dialects: 'attic epic ionic',
      flags: 'contr',
      classes: 'ew_pr,ew_denom',
    });
    expect(parseAnalysis('not an analysis')).toBeUndefined();
  });

  it('refuses output that does not answer every form it was given', () => {
    expect(() => parseCruncher('a\nb\n', ['a'])).toThrow(/answered 2 forms for 1/);
    expect(() => parseCruncher('a\n', ['b'])).toThrow(/answered 'a' where 'b'/);
  });
});

describe('the mapping to TAGNT’s codes: one reading to one code, or unmapped', () => {
  const codes = (segment: string): string[] | 'unmapped' => {
    const raw = parseAnalysis(segment.replaceAll('⇥', '\t'))!;
    const mapped = mapAnalysis(raw);
    return mapped ? mapped.map((m) => `${m.lemma}/${m.code}`) : 'unmapped';
  };

  it('verb, finite: tense, voice and mood letters, person and number', () => {
    expect(codes('V bio/w  pres imperat act 2nd sg⇥⇥contr⇥ow_pr,ow_denom')).toEqual(['βιόω/V-PAM-2S']);
    expect(codes('V a)sqene/w  imperf ind act 3rd sg⇥attic epic ionic⇥contr⇥ew_pr,ew_denom')).toEqual(['ἀσθενέω/V-IAI-3S']);
    expect(codes('V gi/gnomai  pres ind mp 3rd pl⇥⇥pres_redupl⇥w_stem,reg_conj')).toEqual(['γίγνομαι/V-PEI-3P']);
    expect(codes('V bou/lomai  fut subj mid 1st sg⇥⇥⇥w_stem,nw')).toEqual(['βούλομαι/V-FMS-1S']);
    expect(codes('V lu/w  pres opt act 3rd pl⇥⇥⇥w_stem')).toEqual(['λύω/V-PAO-3P']);
  });

  it('verb, aorist: first or second by the ending table, passive by aor_pass; with no table that says, unmapped', () => {
    expect(codes('V e)ktre/fw  aor ind act 3rd sg⇥⇥⇥w_stem,aor1')).toEqual(['ἐκτρέφω/V-AAI-3S']);
    expect(codes('V ba/llw  aor ind act 3rd sg⇥⇥⇥w_stem,aor2')).toEqual(['βάλλω/V-2AAI-3S']);
    expect(codes('V gi/gnomai  aor imperat pass 3rd pl⇥⇥⇥w_stem,aor_pass')).toEqual(['γίγνομαι/V-APM-3P']);
    expect(codes('V fai/nw  aor ind pass 3rd sg⇥⇥⇥w_stem,aor2_pass')).toEqual(['φαίνω/V-2API-3S']);
    expect(codes('V pari/hmi  aor inf act⇥⇥⇥ath_secondary')).toBe('unmapped');
  });

  it('verb, infinitive: no person or number', () => {
    expect(codes('V teleuta/w  pres inf act⇥attic⇥contr⇥aw_pr,aw_denom')).toEqual(['τελευτάω/V-PAN']);
    expect(codes('V e)ktre/fw  aor inf mid⇥⇥⇥w_stem,aor1')).toEqual(['ἐκτρέφω/V-AMN']);
  });

  it('participle: voice, then gender, case and number', () => {
    expect(codes('P za/w  pres part act fem gen pl⇥⇥contr⇥aw_pr')).toEqual(['ζάω/V-PAP-GPF']);
    expect(codes('P lu/w  aor part pass neut nom/voc/acc pl⇥⇥⇥aor_pass')).toEqual(['λύω/V-APP-NPN', 'λύω/V-APP-VPN', 'λύω/V-APP-APN']);
  });

  it('noun: N, then case, number and gender; a list of genders or cases is one code each', () => {
    expect(codes('N makro/ths  fem acc sg⇥⇥⇥hs_htos')).toEqual(['μακρότης/N-ASF']);
    expect(codes('N *da_rei_/ou,*darei=os  masc gen sg⇥⇥⇥os_ou')).toEqual(['Δαρεῖος/N-GSM']);
    expect(codes('N pai=s  masc/fem nom/voc pl⇥⇥indeclform⇥irreg_decl3')).toBe('unmapped');
    expect(codes('N lo/gos  masc nom/voc sg⇥⇥⇥os_ou')).toEqual(['λόγος/N-NSM', 'λόγος/N-VSM']);
    expect(codes('N dw=ron  neut nom/voc/acc pl⇥⇥⇥os_ou')).toEqual(['δῶρον/N-NPN', 'δῶρον/N-VPN', 'δῶρον/N-APN']);
  });

  it('adjective: A, by an adjective’s ending table', () => {
    expect(codes('N a)mfo/teros  masc/neut gen sg⇥⇥⇥os_h_on')).toEqual(['ἀμφότερος/A-GSM', 'ἀμφότερος/A-GSN']);
    expect(codes('N a)lhqh/s  fem acc sg⇥⇥⇥hs_es')).toEqual(['ἀληθής/A-ASF']);
  });

  it('indeclinable words: a conjunction, a particle, an adverb, a preposition, from the class after indeclform', () => {
    expect(codes('N kai/,kai/ ⇥⇥indeclform⇥conj')).toEqual(['καί/CONJ']);
    expect(codes('N me/n,me/n ⇥⇥indeclform⇥particle')).toEqual(['μέν/PRT']);
    expect(codes('N tw/,tw=| ⇥⇥indeclform⇥adverb')).toEqual(['τῷ/ADV']);
    expect(codes('N e)n ⇥⇥indeclform⇥prep')).toEqual(['ἐν/PREP']);
    expect(codes('N du/o ⇥⇥indeclform⇥numeral')).toBe('unmapped');
  });

  it('the article: T, by case, number and gender', () => {
    expect(codes('N o(  masc/neut gen sg⇥⇥indeclform⇥article')).toEqual(['ὁ/T-GSM', 'ὁ/T-GSN']);
  });

  it('leaves unmapped what TAGNT has no code for or the mapping cannot tell: the dual, a comparative, a dialect without Attic, an unaugmented form, a pronoun, a perfect', () => {
    expect(codes('N a)mfo/teros  masc/neut nom/voc/acc dual⇥⇥⇥os_h_on')).toBe('unmapped');
    expect(codes('N ne/os  masc nom comp sg⇥⇥⇥os_h_on')).toBe('unmapped');
    expect(codes('N a)mfo/teros  masc/neut gen sg⇥doric aeolic⇥⇥os_h_on')).toBe('unmapped');
    expect(codes('V teleuta/w  imperf ind act 3rd pl⇥epic doric aeolic⇥unaugmented⇥ath_primary,aw_denom')).toBe('unmapped');
    expect(codes('V bio/w  imperf ind mp 2nd sg⇥attic epic doric⇥contr unaugmented⇥w_stem')).toBe('unmapped');
    expect(codes('N au)to/s  fem nom pl⇥⇥indeclform⇥demonstr')).toBe('unmapped');
    expect(codes('V lu/w  perf ind act 3rd sg⇥⇥⇥perf_act')).toBe('unmapped');
    expect(codes('V lu/w  pres ind act 3rd dual⇥⇥⇥w_stem')).toBe('unmapped');
    expect(codes('E *ku=ros,Cyrus  masc nom sg⇥⇥⇥os_ou')).toBe('unmapped');
  });

  it('a form: its mapped readings once each in a fixed order, and how many it could not map', () => {
    const entry = parseCruncher('x\n<NL>N lo/gos  masc nom sg\t\t\tos_ou</NL><NL>N lo/gos  masc nom sg\t\t\tos_ou</NL><NL>N lo/gos  masc nom sg\tdoric\t\tos_ou</NL><NL>E lo/gos,word  masc nom sg\t\t\tos_ou</NL>\n')[0];
    expect(formOf(entry)).toEqual({ analyses: [{ lemma: 'λόγος', code: 'N-NSM' }], unmapped: 1 });
  });

  it('the cache is a two-column file: the form, then lemma/code readings joined by | and one "unmapped" for each reading left out; it reads back as it was written', () => {
    const cache = new Map([
      [nfc('ἐξέθρεψεν'), { analyses: [{ lemma: nfc('ἐκτρέφω'), code: 'V-AAI-3S' }], unmapped: 0 }],
      [nfc('καταδιώξεται'), { analyses: [{ lemma: nfc('καταδιώκω'), code: 'V-FMI-3S' }], unmapped: 1 }],
      [nfc('ζωσῶν'), { analyses: [], unmapped: 0 }],
    ]);
    const text = cacheText(cache);
    expect(text.split('\n')[0]).toBe('form\tanalyses');
    expect(text).toContain('καταδιώξεται\tκαταδιώκω/V-FMI-3S | unmapped\n');
    expect(text.endsWith('\n')).toBe(true);
    expect(parseCache(text)).toEqual(cache);
    expect(cacheText(parseCache(text))).toBe(text);
  });
});

describe('derive.ts with the cache of the sample file (the seven forms with no candidate)', () => {
  const forms = (result: BookResult): string[] => result.pending.filter((w) => w.candidates.length === 0).map((w) => keyOf(result.words.find((x) => x.ref === w.ref)!.form));

  it('has no candidate for the seven forms without Morpheus (the guard for the rest)', async () => {
    const gen = await runDerive(['--book', 'gen'], { input: GEN_1, outDir: tmp() });
    const psa = await runDerive(['--book', 'psa'], { input: PSA_22, outDir: tmp() });
    expect([...forms(gen), ...forms(psa)].map(nfc).sort()).toEqual(SEVEN.map((f) => keyOf(f)).map(nfc).sort());
  });

  async function withMorpheus(book: 'gen' | 'psa'): Promise<{ result: BookResult; outDir: string; log: string[] }> {
    const outDir = tmp();
    const log: string[] = [];
    const result = await runDerive(['--book', book], { input: book === 'gen' ? GEN_1 : PSA_22, outDir, log: (l) => log.push(l), morpheus: fakeEngine() });
    return { result, outDir, log };
  }
  const wordOf = (result: BookResult, form: string) => {
    const word = result.words.find((w) => nfc(keyOf(w.form)) === nfc(keyOf(form)))!;
    return [...result.derived, ...result.pending].find((w) => w.ref === word.ref)!;
  };
  const pairs = (w: { candidates: readonly { lemma: string; morph: string }[] }): string[] => w.candidates.map((c) => `${c.lemma}/${c.morph}`);

  it('gives a word candidates where the sample gives analyses mapped to TAGNT codes, support “morpheus”', async () => {
    const { result: psa, outDir } = await withMorpheus('psa');
    expect(pairs(wordOf(psa, 'ἐξέθρεψεν'))).toEqual([nfc('ἐκτρέφω/V-AAI-3S')]);
    expect(pairs(wordOf(psa, 'ἐλίπανας'))).toEqual([nfc('λιπαίνω/V-AAI-2S')]);
    expect(pairs(wordOf(psa, 'καταδιώξεται'))).toEqual([nfc('καταδιώκω/V-FMI-3S')]);
    expect(pairs(wordOf(psa, 'μακρότητα'))).toEqual([nfc('μακρότης/N-ASF')]);
    const { result: gen } = await withMorpheus('gen');
    expect(pairs(wordOf(gen, 'Γενηθήτωσαν'))).toEqual([nfc('γίγνομαι/V-APM-3P')]);
    const pending = readFileSync(join(outDir, 'pending', 'psa.tsv'), 'utf8');
    expect(pending).toMatch(/ἐκτρέφω\/V-AAI-3S\/morpheus\t/);
    expect(wordOf(psa, 'ἐξέθρεψεν').notes).toContain('morpheus: candidates from the second method, for the model');
  });

  it('leaves “no candidate” where the sample gives none (ζωσῶν) or an unmapped one (αὐταί)', async () => {
    const { result: gen } = await withMorpheus('gen');
    const { result: psa } = await withMorpheus('psa');
    expect(wordOf(gen, 'ζωσῶν').candidates).toEqual([]);
    expect(wordOf(psa, 'αὐταί').candidates).toEqual([]);
    expect([...forms(gen), ...forms(psa)].map(nfc).sort()).toEqual([nfc('ζωσῶν'), nfc('αὐταί')].sort());
  });

  it('settles nothing by itself: a word given candidates is still waiting for a choice', async () => {
    const { result: psa } = await withMorpheus('psa');
    expect(psa.pending.map((w) => w.ref)).toContain(psa.words.find((w) => nfc(keyOf(w.form)) === nfc('ἐξέθρεψεν'))!.ref);
  });

  it('writes data/lxx/morpheus/<book>.tsv, asks Morpheus only for the forms with no candidate, and asks again for none once they are cached', async () => {
    const calls: string[][] = [];
    const outDir = tmp();
    await runDerive(['--book', 'psa'], { input: PSA_22, outDir, morpheus: fakeEngine(calls) });
    expect(calls).toHaveLength(1);
    expect(calls[0].map(fromBeta).map(nfc).sort()).toEqual(['αὐταί', 'ἐλίπανας', 'ἐξέθρεψεν', 'καταδιώξεται', 'μακρότητα'].map(nfc).sort());
    const file = join(outDir, 'morpheus', 'psa.tsv');
    expect(readFileSync(file, 'utf8')).toContain('ἐξέθρεψεν\tἐκτρέφω/V-AAI-3S\n');
    expect(readFileSync(file, 'utf8')).toContain('αὐταί\tunmapped\n');
    await runDerive(['--book', 'psa'], { input: PSA_22, outDir, morpheus: fakeEngine(calls) });
    expect(calls).toHaveLength(1);
  });

  it('also asks about the guesses in the choices files, and --no-morpheus leaves the step off', async () => {
    const calls: string[][] = [];
    const outDir = tmp();
    const base = await runDerive(['--book', 'gen'], { input: GEN_1, outDir: tmp() });
    const ref = base.pending.find((w) => w.candidates.length > 0)!.ref;
    mkdirSync(join(outDir, 'choices'), { recursive: true });
    const guessed = base.words.find((w) => w.ref === ref)!.form;
    writeFileSync(join(outDir, 'choices', 'gen-01.tsv'), `ref\tparsing\tlemma\tmark\n${ref}\tN-NSM\tx\tguess\n`);
    await runDerive(['--book', 'gen'], { input: GEN_1, outDir, morpheus: fakeEngine(calls) });
    expect(calls[0].map(fromBeta).map(nfc)).toContain(nfc(morpheusKey(guessed)));
    const off = tmp();
    await runDerive(['--book', 'gen', '--no-morpheus'], { input: GEN_1, outDir: off, morpheus: fakeEngine(calls) });
    expect(calls).toHaveLength(1);
    expect(existsSync(join(off, 'morpheus'))).toBe(false);
  });
});

describe('derive.ts with no Docker', () => {
  const files = (dir: string): Record<string, string> =>
    Object.fromEntries(['derived', 'pending'].flatMap((d) => readdirSync(join(dir, d)).map((f) => [`${d}/${f}`, readFileSync(join(dir, d, f), 'utf8')] as const)));

  it('prints one “Morpheus skipped:” line and writes the same bytes as a run with the step off', async () => {
    const empty = tmp();
    const was = process.env.PATH;
    process.env.PATH = empty;
    try {
      expect(dockerEngine().unavailable()).toMatch(/docker/i);
      const offDir = tmp();
      const offLog: string[] = [];
      await runDerive(['--book', 'psa'], { input: PSA_22, outDir: offDir, log: (l) => offLog.push(l) });
      const onDir = tmp();
      const onLog: string[] = [];
      await runDerive(['--book', 'psa'], { input: PSA_22, outDir: onDir, log: (l) => onLog.push(l), morpheus: dockerEngine() });
      const skipped = onLog.filter((l) => l.startsWith('Morpheus skipped: '));
      expect(skipped).toHaveLength(1);
      expect(onLog.filter((l) => !l.startsWith('Morpheus skipped: ')).map((l) => l.replaceAll(onDir, 'OUT'))).toEqual(offLog.map((l) => l.replaceAll(offDir, 'OUT')));
      expect(files(onDir)).toEqual(files(offDir));
      expect(existsSync(join(onDir, 'morpheus'))).toBe(false);
    } finally {
      process.env.PATH = was;
    }
  });

  it('says it once for a whole run of books, and names how to get the image', () => {
    const log: string[] = [];
    const engine: MorpheusEngine = { unavailable: () => 'the image lampas-morpheus is not here', crunch: () => '' };
    const state = { said: false };
    const dir = tmp();
    for (const book of ['a', 'b']) ensureCache(engine, join(dir, `${book}.tsv`), ['λόγος'], (l) => log.push(l), state);
    expect(log).toEqual(['Morpheus skipped: the image lampas-morpheus is not here']);
    expect(MORPHEUS.build).toContain(MORPHEUS.commit);
  });
});

describe('the guesses against Morpheus: agreed, disagreed, unknown', () => {
  /** The Ps 22 fixture's five words with no candidate, each guessed: three the sample agrees with, one it does not, one it does not know (a pronoun it does not map). */
  const GUESSES = [
    ['ἐξέθρεψεν', 'V-AAI-3S', 'ἐκτρέφω'],
    ['ἐλίπανας', 'V-AAI-3S', 'λιπαίνω'],
    ['αὐταί', 'P-NPF', 'αὐτός'],
    ['καταδιώξεται', 'V-FMI-3S', 'καταδιώκω'],
    ['μακρότητα', 'N-ASF', 'μακρότης'],
  ] as const;

  async function setup(): Promise<{ outDir: string; choicesDir: string; input: DeriveInput }> {
    const outDir = tmp();
    const choicesDir = tmp();
    const base = await runDerive(['--book', 'psa'], { input: PSA_22, outDir: tmp() });
    const refOf = (form: string): string => base.words.find((w) => nfc(keyOf(w.form)) === nfc(form))!.ref;
    writeFileSync(join(choicesDir, 'psa-01.tsv'), ['ref\tparsing\tlemma\tmark', ...GUESSES.map(([f, p, l]) => `${refOf(f)}\t${p}\t${nfc(l)}\tguess`)].join('\n') + '\n');
    await runDerive(['--book', 'psa'], { input: PSA_22, outDir, morpheus: fakeEngine(), choicesDir });
    return { outDir, choicesDir, input: PSA_22 };
  }

  it('counts agreed, disagreed and unknown over the guesses of a choices file (release.ts)', async () => {
    const { outDir, choicesDir, input } = await setup();
    const log: string[] = [];
    const error = await runRelease(['--book', 'psa'], { input, outDir, choicesDir, log: (l) => log.push(l), known: () => [] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(log.some((l) => l.includes('Morpheus: 3 agreed, 1 disagreed, 1 unknown'))).toBe(true);
  });

  it('counts a guess Morpheus agreed with by lemma and parsing, a mapped reading none of which fits as disagreed, and no mapped reading as unknown', () => {
    const cache = parseCache(
      ['form\tanalyses', `${nfc('ἔθηκεν')}\t${nfc('τίθημι')}/V-AAI-3S | ${nfc('τίθημι')}/V-2AAI-3S`, `${nfc('ἔστη')}\t${nfc('ἵστημι')}/V-2AAI-3S`, `${nfc('ζωσῶν')}\tunmapped`].join('\n') + '\n',
    );
    const row = (form: string, lemma: string, morph: string) => ({ form, lemma: nfc(lemma), morph });
    const counts = morpheusCounts(
      [row('ἔθηκεν', 'τίθημι', 'V-2AAI-3S'), row('ἔστη', 'ἵστημι', 'V-AAI-3S'), row('ἔστη', 'ἵστημι', 'V-2AAI-3S'), row('ζωσῶν', 'ζάω', 'V-PAP-GPF'), row('ἄλλο', 'ἄλλος', 'A-NSN')],
      cache,
    );
    expect(counts).toEqual({ agreed: 2, disagreed: 1, unknown: 2 });
    const lemmaOnly = morpheusCounts([row('ἔθηκεν', 'ἄλλο', 'V-AAI-3S')], cache);
    expect(lemmaOnly).toEqual({ agreed: 0, disagreed: 1, unknown: 0 });
  });

  it('lxx:report prints the three numbers for the book, and a dash for a book with no cache', async () => {
    const { outDir, choicesDir, input } = await setup();
    const doc = join(tmp(), 'lxx-report.md');
    const out = await runReport(['--build', '55'], { input, doc, choicesDir, recheckDir: tmp(), morpheusDir: join(outDir, 'morpheus'), known: () => [], books: [['Psa', 'Psalms']] });
    expect(out.rows[0].morpheus).toEqual({ agreed: 3, disagreed: 1, unknown: 1 });
    expect(readFileSync(doc, 'utf8')).toContain('Morpheus agreed / differed / unknown');
    expect(readFileSync(doc, 'utf8')).toMatch(/\| Psalms \(Psa\) \|.*\| 3 \/ 1 \/ 1 \|/);
    const none = await runReport(['--build', '55'], { input, doc: join(tmp(), 'r.md'), choicesDir, recheckDir: tmp(), morpheusDir: tmp(), known: () => [], books: [['Psa', 'Psalms']] });
    expect(none.rows[0].morpheus).toBeUndefined();
    expect(none.text).toMatch(/\| Psalms \(Psa\) \|.*\| — \| /);
    expect(readChoices(readFileSync(join(choicesDir, 'psa-01.tsv'), 'utf8')).size).toBe(5);
  });
});

describe('where the step is written down', () => {
  const read = (f: string): string => readFileSync(f, 'utf8');
  it('names Morpheus, its commit, the licence and what reaches the data in the derivation doc, the data README and the credits', () => {
    for (const file of ['docs/lxx-derivation.md', 'data/lxx/README.md', 'ATTRIBUTION.md']) {
      const text = read(file);
      expect(text, file).toContain('Morpheus');
      expect(text, file).toContain(MORPHEUS.commit);
      expect(text, file).toContain('MPL-2.0');
    }
    expect(read('docs/lxx-derivation.md')).toMatch(/never its code/);
    expect(read('ATTRIBUTION.md')).toMatch(/build tool/);
    expect(read('.gitignore')).toContain('data/lxx/morpheus');
  });
});
